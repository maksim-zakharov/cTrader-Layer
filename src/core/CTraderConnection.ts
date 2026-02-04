import * as EventEmitter from "events";
import * as path from "path";
import { v1 } from "uuid";
import { CTraderCommandMap } from "#commands/CTraderCommandMap";
import { CTraderEncoderDecoder } from "#encoder-decoder/CTraderEncoderDecoder";
import { CTraderSocket } from "#sockets/CTraderSocket";
import { GenericObject } from "#utilities/GenericObject";
import { CTraderProtobufReader } from "#protobuf/CTraderProtobufReader";
import { CTraderConnectionParameters } from "#CTraderConnectionParameters";
import axios from "axios";

/**
 * Соединение с cTrader Open API.
 * Поддерживает отправку команд и приём событий от сервера.
 */
export class CTraderConnection extends EventEmitter {
    readonly #commandMap: CTraderCommandMap;
    readonly #encoderDecoder: CTraderEncoderDecoder;
    readonly #protobufReader;
    readonly #socket: CTraderSocket;
    #resolveConnectionPromise?: (...parameters: any[]) => void;
    #rejectConnectionPromise?: (...parameters: any[]) => void;

    /**
     * @param parameters - Параметры подключения (host, port)
     */
    public constructor ({ host, port, }: CTraderConnectionParameters) {
        super();

        this.#commandMap = new CTraderCommandMap({ send: (data: any): void => this.#send(data), });
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
        this.#socket.onData = (data: any): void => this.#onData(data);
        this.#socket.onClose = (): void => this.#onClose();
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
        const message: any = this.#protobufReader.encode(normalizedPayloadType, data ?? {}, clientMsgId);

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
        const connectionPromise = new Promise((resolve, reject) => {
            this.#resolveConnectionPromise = resolve;
            this.#rejectConnectionPromise = reject;
        });

        this.#socket.connect();

        return connectionPromise;
    }

    /**
     * Подписывается на событие от сервера.
     * @param type - Имя события (например, "ProtoOAExecutionEvent") или числовой payload type
     * @param listener - Обработчик события
     * @returns this для цепочки вызовов
     */
    public override on (type: string, listener: (...parameters: any) => any): this {
        const normalizedType: string = Number.isFinite(Number.parseInt(type, 10)) ? type : this.getPayloadTypeByName(type).toString();

        return super.on(normalizedType, listener);
    }

    #send (data: GenericObject): void {
        this.#socket.send(this.#encoderDecoder.encode(data));
    }

    #onOpen (): void {
        if (this.#resolveConnectionPromise) {
            this.#resolveConnectionPromise();
        }

        this.#resolveConnectionPromise = undefined;
        this.#rejectConnectionPromise = undefined;
    }

    #onData (data: Buffer): void {
        this.#encoderDecoder.decode(data);
    }

    #onDecodedData (data: GenericObject): void {
        const payloadType = data.payloadType;
        const payload = data.payload;
        const clientMsgId = data.clientMsgId;
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
        // Silence is golden.
    }

    #onPushEvent (payloadType: number, message: GenericObject): void {
        this.emit(payloadType.toString(), message);
    }

    /**
     * Получает профиль по access token через HTTP API Spotware.
     * @param accessToken - Токен доступа
     * @returns Данные профиля
     */
    public static async getAccessTokenProfile (accessToken: string): Promise<GenericObject> {
        return JSON.parse(await axios.get(`https://api.spotware.com/connect/profile?access_token=${accessToken}`));
    }

    /**
     * Получает список аккаунтов по access token через HTTP API Spotware.
     * @param accessToken - Токен доступа
     * @returns Массив аккаунтов
     */
    public static async getAccessTokenAccounts (accessToken: string): Promise<GenericObject[]> {
        const parsedResponse: any = JSON.parse(await axios.get(`https://api.spotware.com/connect/tradingaccounts?access_token=${accessToken}`));

        if (!Array.isArray(parsedResponse)) {
            return [];
        }

        return parsedResponse;
    }
}
