import type { CTraderDecodedMessage, CTraderPayload } from "#types";
import { GenericObject } from "#utilities/GenericObject";

const protobuf = require("protobufjs");

/** Опции для загрузки proto-файлов */
interface ProtoFileOption {
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

    public decode (buffer: Buffer | Uint8Array): CTraderDecodedMessage {
        const ProtoMessage = this.getMessageByName("ProtoMessage");
        const protoMessage = ProtoMessage.decode(buffer) as { payloadType: number; payload: Buffer | Uint8Array; clientMsgId: string };
        const { payloadType, payload, clientMsgId, } = protoMessage;

        return {
            payload: this.getMessageByPayloadType(payloadType).decode(payload) as CTraderPayload,
            payloadType,
            clientMsgId,
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

    public load (): void {
        this.#params.forEach((param: ProtoFileOption) => {
            this.#builder = protobuf.loadProtoFile(param.file, this.#builder) as ProtobufBuilder;
        });
    }

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

    public findPayloadType (message: ProtobufReflect): number | undefined {
        const field = message.children?.find((f: ProtobufReflect) => f.name === "payloadType");

        if (!field || typeof field.defaultValue !== "number") {
            return undefined;
        }

        return field.defaultValue;
    }

    /**
     * Возвращает класс сообщения по payload type.
     * @param payloadType - Числовой тип payload
     */
    public getMessageByPayloadType (payloadType: number): ProtobufMessageClass {
        return this.#payloadTypes[payloadType].messageBuilded;
    }

    public getMessageByName (name: string): ProtobufMessageClass {
        return this.#names[name].messageBuilded;
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
