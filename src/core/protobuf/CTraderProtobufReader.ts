import * as path from "path";
import protobuf from "protobufjs";
import type { CTraderDecodedMessage, CTraderPayload } from "#types";
import { GenericObject } from "#utilities/GenericObject";

type Enum = protobuf.Enum;
type Message = protobuf.Message;
type Namespace = protobuf.Namespace;
type Root = protobuf.Root;
type Type = protobuf.Type;

const {
    Root: ProtobufRoot,
    Type: ProtobufType,
    Enum: ProtobufEnum,
    Namespace: ProtobufNamespace,
} = protobuf;

/** Опции для загрузки proto-файлов */
export interface ProtoFileOption {
    /** Путь к .proto файлу */
    file: string;
}

interface PayloadTypeEntry {
    /** Адаптер сообщения */
    messageBuilded: ProtobufMessageClass;
    /** Имя protobuf-сообщения */
    name: string;
}

interface NameEntry {
    /** Адаптер сообщения */
    messageBuilded: ProtobufMessageClass;
    /** Числовой payloadType (если задан default в proto) */
    payloadType?: number;
}

/**
 * Совместимый с 1.x адаптер Type → class (new / decode / toBuffer).
 */
export interface ProtobufMessageClass {
    new (params?: GenericObject): ProtobufMessageInstance;
    /** Декодирует тело сообщения */
    decode: (buffer: Buffer | Uint8Array) => GenericObject;
}

/** Экземпляр адаптера сообщения */
export interface ProtobufMessageInstance {
    /** Кодирует в Buffer */
    encode: () => Buffer;
    /** Синоним encode (protobufjs@5) */
    toBuffer: () => Buffer;
}

/**
 * Читатель и кодировщик protobuf-сообщений cTrader Open API (protobufjs@7).
 */
export class CTraderProtobufReader {
    #params: ProtoFileOption[];
    #root: Root | undefined;
    readonly #payloadTypes: Record<number, PayloadTypeEntry> = {};
    readonly #names: Record<string, NameEntry> = {};
    readonly #messages: Record<string, ProtobufMessageClass> = {};
    readonly #enums: Record<string, Enum> = {};

    /**
     * @param options - Список proto-файлов для загрузки
     */
    public constructor (options: ProtoFileOption[]) {
        this.#params = options;
        this.#root = undefined;
    }

    /**
     * Кодирует сообщение в protobuf (кадр ProtoMessage без 4-байтовой длины).
     * @param payloadType - Числовой тип payload
     * @param params - Параметры сообщения
     * @param clientMsgId - Идентификатор сообщения клиента
     */
    public encode (payloadType: number, params: GenericObject, clientMsgId: string): Buffer {
        const MessageCtor = this.getMessageByPayloadType(payloadType);
        const message = new MessageCtor(params);

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
        });
    }

    /**
     * Загружает proto-файлы в Root (protobufjs@7).
     */
    public load (): void {
        const root = new ProtobufRoot();
        const files = this.#params.map((param) => path.resolve(param.file));

        root.loadSync(files, { keepCase: true, });
        root.resolveAll();
        this.#root = root;
    }

    /**
     * Строит карту сообщений и payloadType по default поля payloadType.
     */
    public build (): void {
        const root = this.#root;

        if (!root) {
            throw new Error("Сначала вызовите load()");
        }

        this.#collectNamespace(root);

        for (const [ name, messageClass, ] of Object.entries(this.#messages)) {
            if (name === "ProtoMessage") {
                continue;
            }

            const type = root.lookupType(name);
            const payloadType = this.findPayloadType(type);

            if (typeof payloadType !== "number") {
                continue;
            }

            this.#names[name] = {
                messageBuilded: messageClass,
                payloadType,
            };
            this.#payloadTypes[payloadType] = {
                messageBuilded: messageClass,
                name: name,
            };
        }

        this.#buildWrapper();
    }

    #collectNamespace (namespace: Namespace): void {
        for (const child of namespace.nestedArray ?? []) {
            if (child instanceof ProtobufType) {
                const adapter = this.#createMessageAdapter(child);

                this.#messages[child.name] = adapter;
                this.#names[child.name] = {
                    messageBuilded: adapter,
                    payloadType: undefined,
                };
                this.#collectNamespace(child);
            }
            else if (child instanceof ProtobufEnum) {
                this.#enums[child.name] = child;
            }
            else if (child instanceof ProtobufNamespace) {
                this.#collectNamespace(child);
            }
        }
    }

    #buildWrapper (): void {
        const root = this.#root as Root;
        const name = "ProtoMessage";
        const type = root.lookupType(name);
        const messageBuilded = this.#createMessageAdapter(type);

        this.#messages[name] = messageBuilded;
        this.#names[name] = {
            messageBuilded: messageBuilded,
            payloadType: undefined,
        };
    }

    #createMessageAdapter (type: Type): ProtobufMessageClass {
        const decodeOptions = {
            defaults: true,
            longs: Number,
            enums: Number,
            bytes: Buffer,
        };

        class AdaptedMessage implements ProtobufMessageInstance {
            readonly #value: Message;

            public constructor (params: GenericObject = {}) {
                this.#value = type.create(params);
            }

            public toBuffer (): Buffer {
                return Buffer.from(type.encode(this.#value).finish());
            }

            public encode (): Buffer {
                return this.toBuffer();
            }

            public static decode (buffer: Buffer | Uint8Array): GenericObject {
                const decoded = type.decode(buffer);

                return type.toObject(decoded, decodeOptions) as GenericObject;
            }
        }

        return AdaptedMessage as unknown as ProtobufMessageClass;
    }

    /**
     * Ищет default payloadType у protobuf Type.
     * @param type - Type из protobufjs@7
     */
    public findPayloadType (type: Type): number | undefined {
        const field = type.fields.payloadType;

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
