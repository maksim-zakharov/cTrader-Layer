import { CTraderCommandError } from "#CTraderCommandError";
import { CTraderEncoderDecoder } from "#encoder-decoder/CTraderEncoderDecoder";
import {
    createTestConnection,
    frameMessage,
    openTestConnection,
    unframeMessage,
} from "./__tests__/test-utils";

function toBuffer (encoded: Buffer | { toBuffer: () => Buffer }): Buffer {
    return Buffer.isBuffer(encoded) ? encoded : encoded.toBuffer();
}

describe("CTraderConnection", () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it("открывается и выставляет state open", async () => {
        const test = createTestConnection();
        const states: string[] = [];

        test.connection.on("stateChange", (state) => states.push(state));
        await openTestConnection(test);

        expect(test.connection.isOpen).toBe(true);
        expect(test.connection.state).toBe("open");
        expect(states).toEqual([ "connecting", "open", ]);
        expect(test.socket.connectCount).toBe(1);
    });

    it("подписка on('open') не резолвит protobuf-имя", async () => {
        const test = createTestConnection();
        const onOpen = jest.fn();

        test.connection.on("open", onOpen);
        await openTestConnection(test);
        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it("sendCommand резолвится ответом с тем же clientMsgId", async () => {
        const test = createTestConnection();

        await openTestConnection(test);
        const pending = test.connection.sendCommand("ProtoOAVersionReq", {});

        expect(test.connection.pendingCommandCount).toBe(1);
        const request = test.reader.decode(unframeMessage(test.socket.sent[0]));
        const responseType = test.reader.getPayloadTypeByName("ProtoOAVersionRes");
        const encoded = test.reader.encode(responseType, { version: "88", }, request.clientMsgId);

        test.socket.simulateData(frameMessage(toBuffer(encoded)));
        await expect(pending).resolves.toMatchObject({ version: "88", });
        expect(test.connection.pendingCommandCount).toBe(0);
    });

    it("sendCommand реджектит CTraderCommandError при errorCode", async () => {
        const test = createTestConnection();

        await openTestConnection(test);
        const pending = test.connection.sendCommand("ProtoOAVersionReq", {});
        const request = test.reader.decode(unframeMessage(test.socket.sent[0]));
        const errorType = test.reader.getPayloadTypeByName("ProtoOAErrorRes");
        const encoded = test.reader.encode(errorType, {
            errorCode: "CH_NOT_FOUND",
            description: "нет",
        }, request.clientMsgId);

        test.socket.simulateData(frameMessage(toBuffer(encoded)));
        await expect(pending).rejects.toBeInstanceOf(CTraderCommandError);
        await expect(pending).rejects.toMatchObject({
            errorCode: "CH_NOT_FOUND",
            description: "нет",
        });
    });

    it("trySendCommand возвращает undefined на CTraderCommandError", async () => {
        const test = createTestConnection({ commandTimeoutMs: 30, });

        await openTestConnection(test);
        const result = await test.connection.trySendCommand("ProtoOAVersionReq", {});

        expect(result).toBeUndefined();
    });

    it("sendHeartbeat не попадает в карту команд", async () => {
        const test = createTestConnection();

        await openTestConnection(test);
        test.socket.clearSent();
        test.connection.sendHeartbeat();

        expect(test.connection.pendingCommandCount).toBe(0);
        expect(test.socket.sent).toHaveLength(1);
        const decoded = test.reader.decode(unframeMessage(test.socket.sent[0]));

        expect(decoded.payloadType).toBe(test.reader.getPayloadTypeByName("ProtoHeartbeatEvent"));
    });

    it("автоматически шлёт heartbeat по интервалу", async () => {
        jest.useFakeTimers();
        const test = createTestConnection({ heartbeatIntervalMs: 25, });

        await openTestConnection(test);
        test.socket.clearSent();
        jest.advanceTimersByTime(25);

        expect(test.socket.sent.length).toBeGreaterThanOrEqual(1);
        expect(test.connection.pendingCommandCount).toBe(0);
        test.connection.close();
    });

    it("таймаут команды отклоняет промис кодом COMMAND_TIMEOUT", async () => {
        const test = createTestConnection({ commandTimeoutMs: 30, });

        await openTestConnection(test);
        await expect(test.connection.sendCommand("ProtoOAVersionReq", {})).rejects.toMatchObject({
            errorCode: "COMMAND_TIMEOUT",
        });
        expect(test.connection.pendingCommandCount).toBe(0);
    });

    it("эмитит ProtoOASpotEvent по имени и позволяет off", async () => {
        const test = createTestConnection();

        await openTestConnection(test);
        const listener = jest.fn();

        test.connection.on("ProtoOASpotEvent", listener);
        const payloadType = test.reader.getPayloadTypeByName("ProtoOASpotEvent");
        const encoded = test.reader.encode(payloadType, {
            ctidTraderAccountId: 1,
            symbolId: 2,
            bid: 100,
            ask: 101,
        }, "");

        test.socket.simulateData(frameMessage(toBuffer(encoded)));
        expect(listener).toHaveBeenCalledTimes(1);
        const spot = listener.mock.calls[0][0] as { ctidTraderAccountId: { toNumber: () => number }; symbolId: { toNumber: () => number } };

        expect(spot.ctidTraderAccountId.toNumber()).toBe(1);
        expect(spot.symbolId.toNumber()).toBe(2);

        test.connection.off("ProtoOASpotEvent", listener);
        test.socket.simulateData(frameMessage(toBuffer(encoded)));
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("эмитит unknownMessage вместо падения на неизвестном payloadType", async () => {
        const test = createTestConnection();

        await openTestConnection(test);
        const unknownListener = jest.fn();

        test.connection.on("unknownMessage", unknownListener);
        const ProtoMessage = test.reader.getMessageByName("ProtoMessage");
        const wrapped = new ProtoMessage({
            payloadType: 99999,
            payload: Buffer.alloc(0),
            clientMsgId: "",
        });

        test.socket.simulateData(frameMessage(wrapped.toBuffer()));
        expect(unknownListener).toHaveBeenCalledWith({
            payloadType: 99999,
            clientMsgId: "",
            payload: {},
        });
    });

    it("переподключается после close сокета и вызывает handler", async () => {
        jest.useFakeTimers();
        const test = createTestConnection({
            autoReconnect: true,
            reconnectDelayMs: 1000,
            maxReconnectAttempts: 5,
            heartbeatIntervalMs: 0,
        });
        const reconnecting = jest.fn();
        const handler = jest.fn().mockResolvedValue(undefined);
        const reconnected = new Promise<void>((resolve) => {
            test.connection.on("reconnected", () => resolve());
        });

        test.connection.on("reconnecting", reconnecting);
        test.connection.addReconnectHandler(handler);

        const originalConnect = test.socket.connect.bind(test.socket);

        test.socket.connect = (): void => {
            originalConnect();
            queueMicrotask(() => test.socket.simulateOpen());
        };

        await openTestConnection(test);
        test.socket.simulateClose();

        expect(test.connection.state).toBe("reconnecting");
        expect(reconnecting).toHaveBeenCalledWith({
            attempt: 1,
            maxAttempts: 5,
            delayMs: 1000,
        });

        jest.advanceTimersByTime(1000);
        await reconnected;

        expect(handler).toHaveBeenCalledTimes(1);
        expect(test.connection.isOpen).toBe(true);
        test.connection.close();
    });

    it("эмитит reconnectFailed и close после исчерпания попыток", async () => {
        jest.useFakeTimers();
        const test = createTestConnection({
            autoReconnect: true,
            reconnectDelayMs: 100,
            maxReconnectAttempts: 1,
            heartbeatIntervalMs: 0,
        });
        const failed = jest.fn();
        const closed = jest.fn();

        test.connection.on("reconnectFailed", failed);
        test.connection.on("close", closed);
        test.connection.on("error", (): void => undefined);
        await openTestConnection(test);
        test.socket.simulateClose();
        jest.advanceTimersByTime(100);
        test.socket.simulateError(new Error("нет сети"));
        await Promise.resolve();
        await Promise.resolve();

        expect(failed).toHaveBeenCalledTimes(1);
        expect(closed).toHaveBeenCalled();
        expect(test.connection.state).toBe("closed");
    });

    it("не переподключается после явного close()", async () => {
        const test = createTestConnection({ autoReconnect: true, reconnectDelayMs: 10, });
        const reconnecting = jest.fn();

        test.connection.on("reconnecting", reconnecting);
        await openTestConnection(test);
        test.connection.close();
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(reconnecting).not.toHaveBeenCalled();
        expect(test.connection.state).toBe("closed");
    });

    it("close отклоняет ожидающие команды", async () => {
        const test = createTestConnection();

        await openTestConnection(test);
        const pending = test.connection.sendCommand("ProtoOAVersionReq", {});

        test.connection.close();
        await expect(pending).rejects.toMatchObject({ errorCode: "CONNECTION_CLOSED", });
    });

    it("повторный open при открытом соединении не создаёт второй сокет", async () => {
        const test = createTestConnection();

        await openTestConnection(test);
        await test.connection.open();
        expect(test.socket.connectCount).toBe(1);
    });

    it("повторяет команду при BLOCKED_PAYLOAD_TYPE если включён rateLimitRetry", async () => {
        jest.useFakeTimers();
        const test = createTestConnection({
            rateLimitRetry: true,
            commandTimeoutMs: 5000,
        });

        await openTestConnection(test);
        const pending = test.connection.sendCommand("ProtoOAVersionReq", {});
        const firstId = test.reader.decode(unframeMessage(test.socket.sent[0])).clientMsgId;
        const errorType = test.reader.getPayloadTypeByName("ProtoOAErrorRes");
        const encodedError = test.reader.encode(errorType, {
            errorCode: "BLOCKED_PAYLOAD_TYPE",
            retryAfter: 1,
            description: "rate",
        }, firstId);

        test.socket.simulateData(frameMessage(toBuffer(encodedError)));
        await Promise.resolve();
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(test.socket.sent.length).toBeGreaterThanOrEqual(2);
        const secondId = test.reader.decode(unframeMessage(test.socket.sent[1])).clientMsgId;
        const responseType = test.reader.getPayloadTypeByName("ProtoOAVersionRes");
        const encodedOk = test.reader.encode(responseType, { version: "ok", }, secondId);

        test.socket.simulateData(frameMessage(toBuffer(encodedOk)));
        await expect(pending).resolves.toMatchObject({ version: "ok", });
        test.connection.close();
    });
});
