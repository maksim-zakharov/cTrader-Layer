import { CTraderEncoderDecoder } from "#encoder-decoder/CTraderEncoderDecoder";

describe("CTraderEncoderDecoder", () => {
    it("кодирует длину сообщения в первых 4 байтах big-endian", () => {
        const encoder = new CTraderEncoderDecoder();
        const payload = Buffer.from("abcd");
        const framed = encoder.encode(payload);

        expect(framed.readUInt32BE(0)).toBe(4);
        expect(framed.slice(4).toString()).toBe("abcd");
    });

    it("кодирует объект с toBuffer так же, как Buffer", () => {
        const encoder = new CTraderEncoderDecoder();
        const payload = Buffer.from([ 1, 2, 3, ]);
        const framed = encoder.encode({ toBuffer: (): Buffer => payload, });

        expect(framed.slice(4)).toEqual(payload);
    });

    it("склеивает чанки: длина и тело приходят отдельно", () => {
        const encoder = new CTraderEncoderDecoder();
        const payload = Buffer.from("hello");
        const framed = encoder.encode(payload);
        const received: Buffer[] = [];

        encoder.setDecodeHandler((buffer) => received.push(buffer));
        encoder.decode(framed.slice(0, 2));
        encoder.decode(framed.slice(2, 6));
        encoder.decode(framed.slice(6));

        expect(received).toHaveLength(1);
        expect(received[0].toString()).toBe("hello");
    });

    it("декодирует несколько сообщений в одном буфере без рекурсии", () => {
        const encoder = new CTraderEncoderDecoder();
        const received: string[] = [];

        encoder.setDecodeHandler((buffer) => received.push(buffer.toString()));

        const frames = [ "a", "bb", "ccc", ].map((text) => encoder.encode(Buffer.from(text)));
        encoder.decode(Buffer.concat(frames));

        expect(received).toEqual([ "a", "bb", "ccc", ]);
    });

    it("декодирует пачку из 1000 сообщений", () => {
        const encoder = new CTraderEncoderDecoder();
        const received: Buffer[] = [];

        encoder.setDecodeHandler((buffer) => received.push(buffer));

        const frames: Buffer[] = [];

        for (let i = 0; i < 1000; i += 1) {
            frames.push(encoder.encode(Buffer.from(String(i))));
        }

        encoder.decode(Buffer.concat(frames));
        expect(received).toHaveLength(1000);
        expect(received[999].toString()).toBe("999");
    });

    it("хранит хвост, пока не наберётся полное тело", () => {
        const encoder = new CTraderEncoderDecoder();
        const payload = Buffer.alloc(10, 7);
        const framed = encoder.encode(payload);
        const received: Buffer[] = [];

        encoder.setDecodeHandler((buffer) => received.push(buffer));
        encoder.decode(framed.slice(0, 8));
        expect(received).toHaveLength(0);
        encoder.decode(framed.slice(8));
        expect(received).toHaveLength(1);
        expect(received[0]).toEqual(payload);
    });
});
