import * as EventEmitter from "events";
import * as path from "path";
import { v1 } from "uuid";
import { CTraderCommandMap } from "#commands/CTraderCommandMap";
import { CTraderEncoderDecoder } from "#encoder-decoder/CTraderEncoderDecoder";
import { CTraderSocket } from "#sockets/CTraderSocket";
import { GenericObject } from "#utilities/GenericObject";
import { CTraderProtobufReader } from "#protobuf/CTraderProtobufReader";
import type { CTraderDecodedMessage, CTraderEncodable, CTraderEventMap, CTraderPayload } from "#types";
import { CTraderConnectionParameters, CTraderReconnectHandler } from "#CTraderConnectionParameters";
import axios from "axios";

/**
 * Соединение с cTrader Open API.
 * Поддерживает отправку команд, приём событий от сервера, переподключение и переподписки.
 */
export class CTraderConnection extends EventEmitter {
    readonly #commandMap: CTraderCommandMap;
    readonly #encoderDecoder: CTraderEncoderDecoder;
    readonly #protobufReader;
    readonly #socket: CTraderSocket;
    readonly #params: CTraderConnectionParameters;
    readonly #reconnectHandlers: CTraderReconnectHandler[] = [];
    #resolveConnectionPromise?: () => void;
    #rejectConnectionPromise?: (reason?: Error) => void;
    #reconnectAttempts = 0;
    #reconnectTimeout?: ReturnType<typeof setTimeout>;
    #isClosing = false;

    /**
     * @param parameters - Параметры подключения (host, port, опции переподключения)
     */
    public constructor (parameters: CTraderConnectionParameters) {
        super();

        const { host, port, } = parameters;

        this.#params = parameters;
        this.#commandMap = new CTraderCommandMap({ send: (data: CTraderEncodable): void => this.#send(data), });
        this.#encoderDecoder = new CTraderEncoderDecoder();
        // eslint-disable-next-line max-len
        this.#protobufReader = new CTraderProtobufReader([ {
            file: path.resolve(__dirname, "../../../openapi-proto-messages-main/OpenApiCommonMessages.proto"),
        }, {
            file: path.resolve(__dirname, "../../../openapi-proto-messages-main/OpenApiMessages.proto"),
        }, ]);
        this.#socket = new CTraderSocket({ host, port, });
        this.#resolveConnectionPromise = undefined;
        this.#rejectConnectionPromise = undefined;

        this.#encoderDecoder.setDecodeHandler((data) => this.#onDecodedData(this.#protobufReader.decode(data)));
        this.#protobufReader.load();
        this.#protobufReader.build();

        this.#socket.onOpen = (): void => this.#onOpen();
        this.#socket.onData = (data: Buffer): void => this.#onData(data);
        this.#socket.onClose = (): void => this.#onClose();
        this.#socket.onError = (err: Error): void => this.#onError(err);
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
     * @throws Отклоняется при ошибке от сервера (errorCode в ответе)
     */
    async sendCommand (payloadType: string | number, data?: GenericObject): Promise<GenericObject> {
        const clientMsgId: string = v1();
        const normalizedPayloadType: number = typeof payloadType === "number" ? payloadType : this.getPayloadTypeByName(payloadType);
        const message = this.#protobufReader.encode(normalizedPayloadType, data ?? {}, clientMsgId) as CTraderEncodable;

        return this.#commandMap.create({ clientMsgId, message, });
    }

    /**
     * Отправляет команду без выброса исключения при ошибке.
     * @param payloadType - Имя или числовой идентификатор типа
     * @param data - Данные команды
     * @returns Promise с ответом или undefined при ошибке
     */
    async trySendCommand (payloadType: string | number, data?: GenericObject): Promise<GenericObject | undefined> {
        try {
            return await this.sendCommand(payloadType, data);
        }
        catch {
            return undefined;
        }
    }

    /**
     * Отправляет heartbeat для поддержания соединения.
     * Рекомендуется вызывать каждые 25 секунд.
     */
    public sendHeartbeat (): void {
        this.sendCommand("ProtoHeartbeatEvent");
    }

    /**
     * Открывает соединение с сервером.
     * @returns Promise, разрешаемый при успешном подключении
     */
    public open (): Promise<unknown> {
        this.#isClosing = false;

        const connectionPromise = new Promise((resolve, reject) => {
            this.#resolveConnectionPromise = resolve as () => void;
            this.#rejectConnectionPromise = reject;
        });

        this.#socket.connect();

        return connectionPromise;
    }

    /**
     * Закрывает соединение.
     * Отклоняет все ожидающие команды.
     */
    public close (): void {
        this.#isClosing = true;
        this.#clearReconnectTimeout();
        this.#commandMap.rejectAll({ errorCode: "CONNECTION_CLOSED", description: "Соединение закрыто", });
        this.#socket.close();
        this.emit("close");
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
     * Подписывается на событие от сервера.
     * Тип payload выводится автоматически по имени события из CTraderEventMap.
     * Для неизвестных событий используется CTraderPayload.
     * @param type - Имя события (например, "ProtoOASpotEvent") или числовой payload type
     * @param listener - Обработчик события
     * @returns this для цепочки вызовов
     */
    public override on<K extends keyof CTraderEventMap> (type: K, listener: (payload: CTraderEventMap[K]) => void): this;
    public override on (type: string, listener: (payload: CTraderPayload) => void): this;
    public override on (type: string, listener: (payload: CTraderPayload) => void): this {
        const normalizedType: string = Number.isFinite(Number.parseInt(type, 10)) ? type : this.getPayloadTypeByName(type).toString();

        return super.on(normalizedType, listener);
    }

    #send (data: CTraderEncodable): void {
        this.#socket.send(this.#encoderDecoder.encode(data));
    }

    #onOpen (): void {
        this.#reconnectAttempts = 0;

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
        const { payloadType, payload, clientMsgId, } = data;
        const sentCommand = this.#commandMap.extractById(clientMsgId);

        if (sentCommand) {
            if (typeof payload.errorCode === "string" || typeof payload.errorCode === "number") {
                sentCommand.reject(payload);
            }
            else {
                sentCommand.resolve(payload);
            }
        }
        else {
            this.#onPushEvent(payloadType, data.payload);
        }
    }

    #onClose (): void {
        this.#socket.close();

        if (this.#rejectConnectionPromise) {
            this.#rejectConnectionPromise(new Error("Соединение закрыто"));
        }

        this.#resolveConnectionPromise = undefined;
        this.#rejectConnectionPromise = undefined;
        this.#commandMap.rejectAll({ errorCode: "CONNECTION_CLOSED", description: "Соединение разорвано", });

        if (!this.#isClosing && this.#params.autoReconnect) {
            this.#scheduleReconnect();
        }
        else {
            this.emit("close");
        }
    }

    #onError (err: Error): void {
        this.emit("error", err);

        if (this.#rejectConnectionPromise) {
            this.#rejectConnectionPromise(err);
        }
    }

    #scheduleReconnect (): void {
        const maxAttempts = this.#params.maxReconnectAttempts ?? 5;
        const delayMs = this.#params.reconnectDelayMs ?? 1000;

        if (this.#reconnectAttempts >= maxAttempts) {
            this.emit("reconnectFailed", new Error(`Не удалось переподключиться после ${maxAttempts} попыток`));

            return;
        }

        this.#reconnectAttempts += 1;
        const backoffDelay = delayMs * Math.pow(2, this.#reconnectAttempts - 1);

        this.emit("reconnecting", { attempt: this.#reconnectAttempts, maxAttempts, delayMs: backoffDelay, });

        this.#reconnectTimeout = setTimeout(async () => {
            try {
                await this.open();
                await this.#runReconnectHandlers();
                this.emit("reconnected");
            }
            catch {
                this.#scheduleReconnect();
            }
        }, backoffDelay);
    }

    async #runReconnectHandlers (): Promise<void> {
        for (const handler of this.#reconnectHandlers) {
            await handler(this);
        }
    }

    #clearReconnectTimeout (): void {
        if (this.#reconnectTimeout) {
            clearTimeout(this.#reconnectTimeout);
            this.#reconnectTimeout = undefined;
        }
    }

    #onPushEvent (payloadType: number, message: CTraderPayload): void {
        this.emit(payloadType.toString(), message);
    }

    /**
     * Получает профиль по access token через HTTP API Spotware.
     * @param accessToken - Токен доступа
     * @returns Данные профиля
     */
    public static async getAccessTokenProfile (accessToken: string): Promise<GenericObject> {
        const response = await axios.get(`https://api.spotware.com/connect/profile?access_token=${accessToken}`);

        return response.data as GenericObject;
    }

    /**
     * Получает список аккаунтов по access token через HTTP API Spotware.
     * @param accessToken - Токен доступа
     * @returns Массив аккаунтов
     */
    public static async getAccessTokenAccounts (accessToken: string): Promise<GenericObject[]> {
        const response = await axios.get(`https://api.spotware.com/connect/tradingaccounts?access_token=${accessToken}`);
        const data = response.data;

        if (!Array.isArray(data)) {
            return [];
        }

        return data as GenericObject[];
    }
}
