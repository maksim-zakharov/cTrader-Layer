import * as EventEmitter from "events";
import * as path from "path";
import { v1 } from "uuid";
import axios from "axios";
import { CTraderCommandMap } from "#commands/CTraderCommandMap";
import { CTraderEncoderDecoder } from "#encoder-decoder/CTraderEncoderDecoder";
import { CTraderSocket } from "#sockets/CTraderSocket";
import { GenericObject } from "#utilities/GenericObject";
import { CTraderProtobufReader } from "#protobuf/CTraderProtobufReader";
import type {
    CTraderDecodedMessage,
    CTraderEncodable,
    CTraderEventMap,
    CTraderPayload,
    CTraderReconnectingInfo,
    CTraderUnknownMessage,
} from "#types";
import {
    CTraderConnectionDependencies,
    CTraderConnectionParameters,
    CTraderConnectionState,
    CTraderReconnectHandler,
    computeReconnectDelayMs,
    normalizeConnectionParameters,
} from "#CTraderConnectionParameters";
import { CTraderCommandError } from "#CTraderCommandError";
import { CONNECTION_EVENT_NAMES } from "#connection.constants";
import { resolveProtoDir } from "#resolve-proto-dir";

// Реализация on/off должна быть шире всех overload'ов (включая EventEmitter.on("error")).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConnectionEventListener = (...args: any[]) => void;

/**
 * Соединение с cTrader Open API.
 * Поддерживает отправку команд, приём событий от сервера, переподключение и heartbeat.
 */
export class CTraderConnection extends EventEmitter {
    readonly #commandMap: CTraderCommandMap;
    readonly #encoderDecoder: CTraderEncoderDecoder;
    readonly #protobufReader: CTraderProtobufReader;
    readonly #socket: CTraderSocket;
    readonly #params: ReturnType<typeof normalizeConnectionParameters>;
    readonly #reconnectHandlers: CTraderReconnectHandler[] = [];
    #state: CTraderConnectionState = "idle";
    #resolveConnectionPromise?: () => void;
    #rejectConnectionPromise?: (reason?: Error) => void;
    #openPromise?: Promise<void>;
    #reconnectAttempts = 0;
    #reconnectTimeout?: ReturnType<typeof setTimeout>;
    #heartbeatInterval?: ReturnType<typeof setInterval>;
    #isClosing = false;
    #closeEmitted = false;

    /**
     * @param parameters - Параметры подключения (host, port, опции переподключения)
     * @param dependencies - Подмены сокета и protobuf (для тестов)
     */
    public constructor (parameters: CTraderConnectionParameters,
        dependencies: CTraderConnectionDependencies = {}) {
        super();

        const { host, port, } = parameters;

        this.#params = normalizeConnectionParameters(parameters);
        this.#commandMap = new CTraderCommandMap({ send: (data: CTraderEncodable): void => this.#send(data), });
        this.#encoderDecoder = new CTraderEncoderDecoder();
        this.#protobufReader = dependencies.protobufReader ?? CTraderConnection.#createProtobufReader(parameters.protoDir);
        this.#socket = dependencies.socket ?? new CTraderSocket({
            host,
            port,
            timeoutMs: parameters.tlsTimeoutMs,
        });

        if (!dependencies.protobufReader) {
            this.#protobufReader.load();
            this.#protobufReader.build();
        }

        this.#encoderDecoder.setDecodeHandler((data) => this.#onDecodedData(this.#protobufReader.decode(data)));
        this.#socket.onOpen = (): void => this.#onOpen();
        this.#socket.onData = (data: Buffer): void => this.#onData(data);
        this.#socket.onClose = (): void => this.#onClose();
        this.#socket.onError = (err: Error): void => this.#onError(err);
    }

    /** Текущее состояние соединения */
    public get state (): CTraderConnectionState {
        return this.#state;
    }

    /** Соединение установлено */
    public get isOpen (): boolean {
        return this.#state === "open";
    }

    /** Идёт установка соединения */
    public get isConnecting (): boolean {
        return this.#state === "connecting";
    }

    /** Количество команд, ожидающих ответ */
    public get pendingCommandCount (): number {
        return this.#commandMap.openCommands.length;
    }

    /**
     * Возвращает числовой payload type по имени сообщения.
     * @param name - Имя сообщения (например, "ProtoOAExecutionEvent")
     * @returns Числовой идентификатор типа
     */
    public getPayloadTypeByName (name: string): number {
        return this.#protobufReader.getPayloadTypeByName(name);
    }

    /**
     * Отправляет команду на сервер и ожидает ответ.
     * @param payloadType - Имя или числовой идентификатор типа сообщения
     * @param data - Данные команды
     * @returns Promise с ответом сервера
     * @throws {CTraderCommandError} при ошибке сервера, таймауте или закрытии соединения
     */
    async sendCommand<TRes extends GenericObject = GenericObject> (payloadType: string | number,
        data?: GenericObject): Promise<TRes> {
        return this.#sendCommandInternal<TRes>(payloadType, data, true);
    }

    /**
     * Отправляет команду без выброса CTraderCommandError.
     * Прочие исключения пробрасываются.
     * @param payloadType - Имя или числовой идентификатор типа
     * @param data - Данные команды
     * @returns Promise с ответом или undefined при ошибке команды
     */
    async trySendCommand<TRes extends GenericObject = GenericObject> (payloadType: string | number,
        data?: GenericObject): Promise<TRes | undefined> {
        try {
            return await this.sendCommand<TRes>(payloadType, data);
        }
        catch (error) {
            if (error instanceof CTraderCommandError) {
                return undefined;
            }

            throw error;
        }
    }

    /**
     * Отправляет heartbeat, не ожидая ответа (не попадает в карту команд).
     * Рекомендуется каждые 25 секунд; при heartbeatIntervalMs > 0 отправляется автоматически.
     */
    public sendHeartbeat (): void {
        if (this.#state !== "open") {
            return;
        }

        const payloadType = this.getPayloadTypeByName("ProtoHeartbeatEvent");
        const message = this.#protobufReader.encode(payloadType, {}, "") as CTraderEncodable;

        this.#send(message);
    }

    /**
     * Открывает соединение с сервером.
     * Повторный вызов при уже открытом соединении сразу резолвится.
     * @returns Promise, разрешаемый при успешном подключении
     */
    public open (): Promise<void> {
        if (this.#state === "open") {
            return Promise.resolve();
        }

        if (this.#openPromise && (this.#state === "connecting" || this.#state === "reconnecting")) {
            return this.#openPromise;
        }

        this.#isClosing = false;
        this.#closeEmitted = false;

        if (this.#state !== "reconnecting") {
            this.#setState("connecting");
        }

        this.#openPromise = new Promise((resolve, reject) => {
            this.#resolveConnectionPromise = resolve;
            this.#rejectConnectionPromise = reject;
        });

        this.#socket.connect();

        return this.#openPromise;
    }

    /**
     * Закрывает соединение.
     * Отклоняет все ожидающие команды и останавливает reconnect/heartbeat.
     */
    public close (): void {
        if (this.#state === "closed" && this.#isClosing) {
            return;
        }

        this.#isClosing = true;
        this.#stopHeartbeat();
        this.#clearReconnectTimeout();
        this.#rejectPendingCommands("CONNECTION_CLOSED", "Соединение закрыто");
        this.#setState("closed");
        this.#socket.close();
        this.#emitCloseOnce();
    }

    /**
     * Добавляет обработчик переподключения.
     * Вызывается после успешного переподключения для повторной аутентификации и подписок.
     * @param handler - Асинхронная функция, выполняющая повторную аутентификацию и подписки
     */
    public addReconnectHandler (handler: CTraderReconnectHandler): void {
        this.#reconnectHandlers.push(handler);
    }

    /**
     * Удаляет обработчик переподключения.
     * @param handler - Обработчик для удаления
     */
    public removeReconnectHandler (handler: CTraderReconnectHandler): void {
        const index = this.#reconnectHandlers.indexOf(handler);

        if (index !== -1) {
            this.#reconnectHandlers.splice(index, 1);
        }
    }

    /**
     * Подписывается на событие от сервера или на событие жизненного цикла соединения.
     * @param type - Имя события или числовой payload type
     * @param listener - Обработчик
     */
    public override on<K extends keyof CTraderEventMap> (type: K, listener: (payload: CTraderEventMap[K]) => void): this;
    public override on (type: "open" | "close" | "reconnected", listener: () => void): this;
    public override on (event: "error", listener: (error: Error) => void): this;
    public override on (type: "reconnectFailed", listener: (error: Error) => void): this;
    public override on (type: "reconnecting", listener: (info: CTraderReconnectingInfo) => void): this;
    public override on (type: "stateChange", listener: (state: CTraderConnectionState) => void): this;
    public override on (type: "unknownMessage", listener: (message: CTraderUnknownMessage) => void): this;
    public override on (type: string, listener: ConnectionEventListener): this;
    public override on (type: string, listener: ConnectionEventListener): this {
        return super.on(this.#normalizeEventType(type), listener);
    }

    public override addListener<K extends keyof CTraderEventMap> (type: K, listener: (payload: CTraderEventMap[K]) => void): this;
    public override addListener (type: string, listener: ConnectionEventListener): this;
    public override addListener (type: string, listener: ConnectionEventListener): this {
        return super.addListener(this.#normalizeEventType(type), listener);
    }

    public override once<K extends keyof CTraderEventMap> (type: K, listener: (payload: CTraderEventMap[K]) => void): this;
    public override once (type: "open" | "close" | "reconnected", listener: () => void): this;
    public override once (type: string, listener: ConnectionEventListener): this;
    public override once (type: string, listener: ConnectionEventListener): this {
        return super.once(this.#normalizeEventType(type), listener);
    }

    public override off<K extends keyof CTraderEventMap> (type: K, listener: (payload: CTraderEventMap[K]) => void): this;
    public override off (type: string, listener: ConnectionEventListener): this;
    public override off (type: string, listener: ConnectionEventListener): this {
        return super.off(this.#normalizeEventType(type), listener);
    }

    public override removeListener<K extends keyof CTraderEventMap> (type: K, listener: (payload: CTraderEventMap[K]) => void): this;
    public override removeListener (type: string, listener: ConnectionEventListener): this;
    public override removeListener (type: string, listener: ConnectionEventListener): this {
        return super.removeListener(this.#normalizeEventType(type), listener);
    }

    public override prependListener<K extends keyof CTraderEventMap> (type: K, listener: (payload: CTraderEventMap[K]) => void): this;
    public override prependListener (type: string, listener: ConnectionEventListener): this;
    public override prependListener (type: string, listener: ConnectionEventListener): this {
        return super.prependListener(this.#normalizeEventType(type), listener);
    }

    async #sendCommandInternal<TRes extends GenericObject> (payloadType: string | number,
        data: GenericObject | undefined,
        allowRetry: boolean): Promise<TRes> {
        const clientMsgId: string = v1();
        const normalizedPayloadType: number = typeof payloadType === "number"
            ? payloadType
            : this.getPayloadTypeByName(payloadType);
        const message = this.#protobufReader.encode(normalizedPayloadType, data ?? {}, clientMsgId) as CTraderEncodable;

        try {
            return await this.#commandMap.create({
                clientMsgId,
                message,
                timeoutMs: this.#params.commandTimeoutMs,
            }) as TRes;
        }
        catch (error) {
            if (
                allowRetry
                && this.#params.rateLimitRetry
                && error instanceof CTraderCommandError
                && error.errorCode === "BLOCKED_PAYLOAD_TYPE"
            ) {
                const waitMs = (error.retryAfter ?? 1) * 1000;

                await new Promise((resolve) => setTimeout(resolve, waitMs));

                return this.#sendCommandInternal<TRes>(payloadType, data, false);
            }

            throw error;
        }
    }

    #send (data: CTraderEncodable): void {
        this.#socket.send(this.#encoderDecoder.encode(data));
    }

    #onOpen (): void {
        this.#reconnectAttempts = 0;
        this.#setState("open");
        this.#startHeartbeat();

        if (this.#resolveConnectionPromise) {
            this.#resolveConnectionPromise();
        }

        this.#resolveConnectionPromise = undefined;
        this.#rejectConnectionPromise = undefined;
        this.emit("open");
    }

    #onData (data: Buffer): void {
        this.#encoderDecoder.decode(data);
    }

    #onDecodedData (data: CTraderDecodedMessage): void {
        const {
            payloadType, payload, clientMsgId, unknown,
        } = data;
        const sentCommand = this.#commandMap.extractById(clientMsgId);

        if (sentCommand) {
            if (unknown) {
                sentCommand.reject(new CTraderCommandError({
                    errorCode: "UNKNOWN_PAYLOAD_TYPE",
                    description: `Неизвестный payloadType ${payloadType}`,
                }, { clientMsgId, payloadType, }));

                return;
            }

            if (CTraderCommandError.hasErrorCode(payload)) {
                sentCommand.reject(new CTraderCommandError(payload, { clientMsgId, payloadType, }));
            }
            else {
                sentCommand.resolve(payload);
            }

            return;
        }

        if (unknown) {
            this.emit("unknownMessage", {
                payloadType, clientMsgId, payload,
            } as CTraderUnknownMessage);

            return;
        }

        this.#onPushEvent(payloadType, payload);
    }

    #onClose (): void {
        this.#stopHeartbeat();
        this.#openPromise = undefined;

        if (this.#rejectConnectionPromise) {
            this.#rejectConnectionPromise(new Error("Соединение закрыто"));
        }

        this.#resolveConnectionPromise = undefined;
        this.#rejectConnectionPromise = undefined;
        this.#rejectPendingCommands("CONNECTION_CLOSED", "Соединение разорвано");

        if (!this.#isClosing && this.#params.autoReconnect) {
            this.#setState("reconnecting");
            this.#scheduleReconnect();

            return;
        }

        this.#setState("closed");
        this.#emitCloseOnce();
    }

    #onError (err: Error): void {
        if (this.listenerCount("error") > 0) {
            this.emit("error", err);
        }

        if (this.#rejectConnectionPromise) {
            this.#rejectConnectionPromise(err);
            this.#resolveConnectionPromise = undefined;
            this.#rejectConnectionPromise = undefined;
        }
    }

    #scheduleReconnect (): void {
        if (this.#reconnectTimeout !== undefined || this.#isClosing) {
            return;
        }

        const maxAttempts = this.#params.maxReconnectAttempts;
        const unlimited = maxAttempts === 0;

        if (!unlimited && this.#reconnectAttempts >= maxAttempts) {
            this.#setState("closed");
            this.emit("reconnectFailed", new Error(`Не удалось переподключиться после ${maxAttempts} попыток`));
            this.#emitCloseOnce();

            return;
        }

        this.#reconnectAttempts += 1;
        const delayMs = computeReconnectDelayMs(this.#reconnectAttempts,
            this.#params.reconnectDelayMs,
            this.#params.maxReconnectDelayMs,
            this.#params.reconnectJitter);
        const info: CTraderReconnectingInfo = {
            attempt: this.#reconnectAttempts,
            maxAttempts: unlimited ? Number.POSITIVE_INFINITY : maxAttempts,
            delayMs,
        };

        this.emit("reconnecting", info);

        this.#reconnectTimeout = setTimeout(() => {
            this.#reconnectTimeout = undefined;
            void this.#attemptReconnect();
        }, delayMs);
    }

    async #attemptReconnect (): Promise<void> {
        if (this.#isClosing) {
            return;
        }

        try {
            await this.open();
            await this.#runReconnectHandlers();
            this.emit("reconnected");
        }
        catch {
            if (!this.#isClosing) {
                this.#scheduleReconnect();
            }
        }
    }

    async #runReconnectHandlers (): Promise<void> {
        for (const handler of this.#reconnectHandlers) {
            await handler(this);
        }
    }

    #startHeartbeat (): void {
        this.#stopHeartbeat();
        const interval = this.#params.heartbeatIntervalMs;

        if (!interval || interval <= 0) {
            return;
        }

        this.#heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, interval);

        if (typeof this.#heartbeatInterval.unref === "function") {
            this.#heartbeatInterval.unref();
        }
    }

    #stopHeartbeat (): void {
        if (this.#heartbeatInterval) {
            clearInterval(this.#heartbeatInterval);
            this.#heartbeatInterval = undefined;
        }
    }

    #clearReconnectTimeout (): void {
        if (this.#reconnectTimeout) {
            clearTimeout(this.#reconnectTimeout);
            this.#reconnectTimeout = undefined;
        }
    }

    #rejectPendingCommands (errorCode: string, description: string): void {
        this.#commandMap.rejectAll(new CTraderCommandError({ errorCode, description, }));
    }

    #setState (state: CTraderConnectionState): void {
        if (this.#state === state) {
            return;
        }

        this.#state = state;
        this.emit("stateChange", state);
    }

    #emitCloseOnce (): void {
        if (this.#closeEmitted) {
            return;
        }

        this.#closeEmitted = true;
        this.emit("close");
    }

    #normalizeEventType (type: string): string {
        if (CONNECTION_EVENT_NAMES.has(type)) {
            return type;
        }

        if (/^\d+$/.test(type)) {
            return type;
        }

        return this.getPayloadTypeByName(type).toString();
    }

    #onPushEvent (payloadType: number, message: CTraderPayload): void {
        this.emit(payloadType.toString(), message);
    }

    static #createProtobufReader (protoDir?: string): CTraderProtobufReader {
        const dir = resolveProtoDir(protoDir);

        return new CTraderProtobufReader([ {
            file: path.join(dir, "OpenApiCommonMessages.proto"),
        }, {
            file: path.join(dir, "OpenApiMessages.proto"),
        }, ]);
    }

    /**
     * Получает профиль по access token через HTTP API Spotware.
     * @param accessToken - Токен доступа
     * @returns Данные профиля
     */
    public static async getAccessTokenProfile (accessToken: string): Promise<GenericObject> {
        const response = await axios.get("https://api.spotware.com/connect/profile", {
            headers: CTraderConnection.#authorizationHeaders(accessToken),
        });

        return response.data as GenericObject;
    }

    /**
     * Получает список аккаунтов по access token через HTTP API Spotware.
     * @param accessToken - Токен доступа
     * @returns Массив аккаунтов
     */
    public static async getAccessTokenAccounts (accessToken: string): Promise<GenericObject[]> {
        const response = await axios.get("https://api.spotware.com/connect/tradingaccounts", {
            headers: CTraderConnection.#authorizationHeaders(accessToken),
        });
        const data = response.data;

        if (!Array.isArray(data)) {
            return [];
        }

        return data as GenericObject[];
    }

    static #authorizationHeaders (accessToken: string): { Authorization: string } {
        return { Authorization: `Bearer ${accessToken}`, };
    }
}
