import { Buffer } from "buffer";
import type { CTraderEncodable } from "#types";

/**
 * Кодировщик/декодировщик сообщений cTrader.
 * Формат: 4 байта (длина big-endian) + protobuf payload.
 */
export class CTraderEncoderDecoder {
    readonly #sizeLength: number;
    #size?: number;
    #tail?: Buffer;
    #decodeHandler?: (buffer: Buffer) => void;

    public constructor () {
        this.#sizeLength = 4;
        this.#size = undefined;
        this.#tail = undefined;
        this.#decodeHandler = undefined;
    }

    /**
     * Устанавливает обработчик декодированных данных.
     * @param handler - Колбэк, вызываемый с декодированным буфером
     */
    public setDecodeHandler (handler: (buffer: Buffer) => void): void {
        this.#decodeHandler = handler;
    }

    /**
     * Кодирует protobuf-payload в кадр Open API (длина + тело).
     * @param data - Buffer или объект с toBuffer()
     */
    public encode (data: CTraderEncodable): Buffer {
        const normalizedData = Buffer.isBuffer(data) ? data : data.toBuffer();
        const sizeLength: number = this.#sizeLength;
        const normalizedDataLength: number = normalizedData.length;
        const size = Buffer.alloc(sizeLength);

        size.writeInt32BE(normalizedDataLength, 0);

        return Buffer.concat([ size, normalizedData, ], sizeLength + normalizedDataLength);
    }

    /**
     * Декодирует входящий TCP-поток. Поддерживает склейку чанков и несколько сообщений в одном буфере.
     * @param buffer - Очередной кусок данных
     */
    public decode (buffer: Buffer): void {
        let usedBuffer: Buffer = this.#tail
            ? Buffer.concat([ this.#tail, buffer, ], this.#tail.length + buffer.length)
            : buffer;

        this.#tail = undefined;

        while (usedBuffer.length > 0) {
            if (this.#size === undefined) {
                if (usedBuffer.length < this.#sizeLength) {
                    this.#tail = usedBuffer;

                    return;
                }

                this.#size = usedBuffer.readUInt32BE(0);
                usedBuffer = usedBuffer.slice(this.#sizeLength);
                continue;
            }

            if (usedBuffer.length < this.#size) {
                this.#tail = usedBuffer;

                return;
            }

            const message = usedBuffer.slice(0, this.#size);

            usedBuffer = usedBuffer.slice(this.#size);
            this.#size = undefined;
            this.#decodeHandler?.(message);
        }
    }
}
