import type { CTraderDecodedMessage, CTraderPayload } from "#types";
import { GenericObject } from "#utilities/GenericObject";

const protobuf = require("protobufjs");

/** Опции для загрузки proto-файлов */
export interface ProtoFileOption {
    /** Путь к .proto файлу */
    file: string;
}

/** Внутренняя структура protobuf builder (типы из библиотеки protobufjs) */
interface ProtobufBuilder {
    build: (name?: string) => unknown;
    ns: { children: ProtobufReflect[] };
}

interface ProtobufReflect {
    className: string;
    name: string;
    children?: ProtobufReflect[];
    defaultValue?: number;
}

interface PayloadTypeEntry {
    messageBuilded: ProtobufMessageClass;
    name: string;
}

interface NameEntry {
    messageBuilded: ProtobufMessageClass;
    payloadType?: number;
}

interface ProtobufMessageClass {
    new (params: GenericObject): ProtobufMessageInstance;
    decode: (buffer: Buffer | Uint8Array) => GenericObject;
}

interface ProtobufMessageInstance {
    encode: () => Buffer;
    toBuffer: () => Buffer;
}

/**
 * Читатель и кодировщик protobuf-сообщений cTrader Open API.
 */
export class CTraderProtobufReader {
    #params: ProtoFileOption[];
    #builder: ProtobufBuilder | undefined;
    readonly #payloadTypes: Record<number, PayloadTypeEntry> = {};
    readonly #names: Record<string, NameEntry> = {};
    readonly #messages: Record<string, ProtobufMessageClass> = {};
    readonly #enums: Record<string, unknown> = {};

    /**
     * @param options - Список proto-файлов для загрузки
     */
    public constructor (options: ProtoFileOption[]) {
        this.#params = options;
        this.#builder = undefined;
        this.#payloadTypes = {};
        this.#names = {};
        this.#messages = {};
        this.#enums = {};
    }

    /**
     * Кодирует сообщение в protobuf.
     * @param payloadType - Числовой тип payload
     * @param params - Параметры сообщения
     * @param clientMsgId - Идентификатор сообщения клиента
     */
    public encode (payloadType: number, params: GenericObject, clientMsgId: string): Buffer {
        const Message = this.getMessageByPayloadType(payloadType);
        const message = new Message(params);

        return this.#wrap(payloadType, message, clientMsgId).encode();
    }

    /**
     * Декодирует кадр ProtoMessage. Неизвестный payloadType не бросает исключение.
     * @param buffer - Тело кадра без 4-байтовой длины
     */
    public decode (buffer: Buffer | Uint8Array): CTraderDecodedMessage {
        const ProtoMessage = this.getMessageByName("ProtoMessage");
        const protoMessage = ProtoMessage.decode(buffer) as {
            payloadType: number;
            payload?: Buffer | Uint8Array;
            clientMsgId?: string;
        };
        const {
            payloadType, payload, clientMsgId,
        } = protoMessage;
        const normalizedClientMsgId = clientMsgId ?? "";

        if (!this.hasPayloadType(payloadType)) {
            return {
                payload: {},
                payloadType,
                clientMsgId: normalizedClientMsgId,
                unknown: true,
            };
        }

        const payloadBuffer = payload ?? Buffer.alloc(0);

        return {
            payload: this.getMessageByPayloadType(payloadType).decode(payloadBuffer) as CTraderPayload,
            payloadType,
            clientMsgId: normalizedClientMsgId,
        };
    }

    #wrap (payloadType: number, message: ProtobufMessageInstance, clientMsgId: string): ProtobufMessageInstance {
        const ProtoMessage = this.getMessageByName("ProtoMessage");

        return new ProtoMessage({
            payloadType: payloadType,
            payload: message.toBuffer(),
            clientMsgId: clientMsgId,
        }) as ProtobufMessageInstance;
    }

    /**
     * Загружает proto-файлы в builder.
     */
    public load (): void {
        this.#params.forEach((param: ProtoFileOption) => {
            this.#builder = protobuf.loadProtoFile(param.file, this.#builder) as ProtobufBuilder;
        });
    }

    /**
     * Строит карту сообщений и payloadType.
     */
    public build (): void {
        const builder = this.#builder as ProtobufBuilder;

        builder.build();

        const messages: ProtobufReflect[] = [];
        const enums: ProtobufReflect[] = [];

        builder.ns.children.forEach((reflect: ProtobufReflect) => {
            const className: string = reflect.className;

            if (className === "Message") {
                messages.push(reflect);
            }
            else if (className === "Enum") {
                enums.push(reflect);
            }
        });

        messages.filter((message) => typeof this.findPayloadType(message) === "number").forEach((message) => {
            const name: string = message.name;
            const messageBuilded = builder.build(name) as ProtobufMessageClass;

            this.#messages[name] = messageBuilded;

            const payloadType = this.findPayloadType(message);

            if (typeof payloadType !== "number") {
                return;
            }

            this.#names[name] = {
                messageBuilded: messageBuilded,
                payloadType,
            };
            this.#payloadTypes[payloadType] = {
                messageBuilded: messageBuilded,
                name: name,
            };
        });

        enums.forEach((enume: ProtobufReflect) => {
            const name: string = enume.name;

            this.#enums[name] = builder.build(name);
        });

        this.#buildWrapper();
    }

    #buildWrapper (): void {
        const builder = this.#builder as ProtobufBuilder;
        const name = "ProtoMessage";
        const messageBuilded = builder.build(name) as ProtobufMessageClass;

        this.#messages[name] = messageBuilded;
        this.#names[name] = {
            messageBuilded: messageBuilded,
            payloadType: undefined,
        };
    }

    /**
     * Ищет default payloadType у protobuf-сообщения.
     * @param message - Reflect-описание сообщения
     */
    public findPayloadType (message: ProtobufReflect): number | undefined {
        const field = message.children?.find((f: ProtobufReflect) => f.name === "payloadType");

        if (!field || typeof field.defaultValue !== "number") {
            return undefined;
        }

        return field.defaultValue;
    }

    /**
     * Есть ли зарегистрированный класс для payloadType.
     * @param payloadType - Числовой тип
     */
    public hasPayloadType (payloadType: number): boolean {
        return this.#payloadTypes[payloadType] !== undefined;
    }

    /**
     * Возвращает класс сообщения по payload type.
     * @param payloadType - Числовой тип payload
     */
    public getMessageByPayloadType (payloadType: number): ProtobufMessageClass {
        const entry = this.#payloadTypes[payloadType];

        if (!entry) {
            throw new Error(`Unknown payloadType: ${payloadType}`);
        }

        return entry.messageBuilded;
    }

    /**
     * Возвращает класс сообщения по имени.
     * @param name - Имя protobuf-сообщения
     */
    public getMessageByName (name: string): ProtobufMessageClass {
        const entry = this.#names[name];

        if (!entry) {
            throw new Error(`Unknown message name: ${name}`);
        }

        return entry.messageBuilded;
    }

    /**
     * Возвращает payload type по имени сообщения.
     * @param name - Имя сообщения
     */
    public getPayloadTypeByName (name: string): number {
        const payloadType = this.#names[name]?.payloadType;

        if (typeof payloadType !== "number") {
            throw new Error(`Unknown message name: ${name}`);
        }

        return payloadType;
    }
}
