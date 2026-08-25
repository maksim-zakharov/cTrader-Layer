import { getTestProtobufReader } from "../__tests__/test-utils";

describe("CTraderProtobufReader", () => {
    const reader = getTestProtobufReader();

    it("резолвит payloadType по имени heartbeat", () => {
        const payloadType = reader.getPayloadTypeByName("ProtoHeartbeatEvent");

        expect(payloadType).toBeGreaterThan(0);
        expect(reader.hasPayloadType(payloadType)).toBe(true);
    });

    it("бросает на неизвестное имя сообщения", () => {
        expect(() => reader.getPayloadTypeByName("NotAMessage")).toThrow(/Unknown message name/);
    });

    it("бросает на неизвестный payloadType при encode", () => {
        expect(() => reader.encode(99999, {}, "id")).toThrow(/Unknown payloadType/);
    });

    it("кодирует и декодирует heartbeat без ошибки", () => {
        const payloadType = reader.getPayloadTypeByName("ProtoHeartbeatEvent");
        const encoded = reader.encode(payloadType, {}, "hb-1");
        const buffer = Buffer.isBuffer(encoded) ? encoded : (encoded as { toBuffer: () => Buffer }).toBuffer();
        const decoded = reader.decode(buffer);

        expect(decoded.payloadType).toBe(payloadType);
        expect(decoded.clientMsgId).toBe("hb-1");
        expect(decoded.unknown).toBeUndefined();
    });

    it("не падает на неизвестном payloadType при decode", () => {
        const ProtoMessage = reader.getMessageByName("ProtoMessage");
        const wrapped = new ProtoMessage({
            payloadType: 99999,
            payload: Buffer.alloc(0),
            clientMsgId: "unknown-1",
        });
        const encoded = wrapped.toBuffer();
        const decoded = reader.decode(encoded);

        expect(decoded.unknown).toBe(true);
        expect(decoded.payloadType).toBe(99999);
        expect(decoded.clientMsgId).toBe("unknown-1");
        expect(decoded.payload).toEqual({});
    });

    it("кодирует и декодирует ProtoOAVersionReq", () => {
        const payloadType = reader.getPayloadTypeByName("ProtoOAVersionReq");
        const encoded = reader.encode(payloadType, {}, "ver-1");
        const buffer = Buffer.isBuffer(encoded) ? encoded : (encoded as { toBuffer: () => Buffer }).toBuffer();
        const decoded = reader.decode(buffer);

        expect(decoded.payloadType).toBe(payloadType);
        expect(decoded.clientMsgId).toBe("ver-1");
        expect(decoded.unknown).toBeUndefined();
    });
});
