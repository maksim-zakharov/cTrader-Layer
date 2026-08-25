import * as path from "path";
import { CTraderEncoderDecoder } from "#encoder-decoder/CTraderEncoderDecoder";
import { CTraderProtobufReader } from "#protobuf/CTraderProtobufReader";
import { CTraderConnection } from "#CTraderConnection";
import { CTraderConnectionParameters } from "#CTraderConnectionParameters";
import { FakeCTraderSocket } from "./fake-socket";

const PROTO_DIR = path.resolve(__dirname, "../../../openapi-proto-messages-main");

let sharedReader: CTraderProtobufReader | undefined;

/**
 * Общий protobuf-ридер для тестов (load/build один раз).
 */
export function getTestProtobufReader (): CTraderProtobufReader {
    if (!sharedReader) {
        sharedReader = new CTraderProtobufReader([
            { file: path.join(PROTO_DIR, "OpenApiCommonMessages.proto"), },
            { file: path.join(PROTO_DIR, "OpenApiMessages.proto"), },
        ]);
        sharedReader.load();
        sharedReader.build();
    }

    return sharedReader;
}

/**
 * Оборачивает protobuf-тело в кадр Open API (4 байта длины).
 * @param payload - Тело сообщения
 */
export function frameMessage (payload: Buffer): Buffer {
    return new CTraderEncoderDecoder().encode(payload);
}

/**
 * Снимает 4-байтовую длину с кадра.
 * @param frame - Полный кадр
 */
export function unframeMessage (frame: Buffer): Buffer {
    return frame.slice(4);
}

export interface TestConnection {
    /** Тестируемое соединение */
    connection: CTraderConnection;
    /** Подмена сокета */
    socket: FakeCTraderSocket;
    /** Ридер proto */
    reader: CTraderProtobufReader;
}

/**
 * Создаёт соединение с FakeCTraderSocket и реальным protobuf.
 * @param parameters - Частичные параметры соединения
 */
export function createTestConnection (
    parameters: Partial<CTraderConnectionParameters> = {},
): TestConnection {
    const socket = new FakeCTraderSocket({ host: "localhost", port: 5035, });
    const reader = getTestProtobufReader();
    const connection = new CTraderConnection({
        host: "localhost",
        port: 5035,
        heartbeatIntervalMs: 0,
        commandTimeoutMs: 1000,
        reconnectJitter: false,
        ...parameters,
    }, { socket, protobufReader: reader, });

    return { connection, socket, reader, };
}

/**
 * Открывает тестовое соединение (connect + simulateOpen).
 * @param testConnection - Результат createTestConnection
 */
export async function openTestConnection (testConnection: TestConnection): Promise<void> {
    const openPromise = testConnection.connection.open();

    testConnection.socket.simulateOpen();
    await openPromise;
}

/**
 * Приводит protobuf int64 к number (protobufjs может отдать Long или number).
 * @param value - Декодированное поле
 */
export function protoNumber (value: unknown): number {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string" && value !== "") {
        return Number(value);
    }

    const candidate = value as { toNumber?: () => number } | null | undefined;

    if (candidate && typeof candidate.toNumber === "function") {
        return candidate.toNumber();
    }

    throw new Error(`Нечисловое proto-поле: ${String(value)}`);
}
