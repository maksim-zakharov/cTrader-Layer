import { Buffer } from "buffer";
import { GenericObject } from "#utilities/GenericObject";

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

    public encode (data: Buffer): Buffer {
        const normalizedData = data;
        const sizeLength: number = this.#sizeLength;
        const normalizedDataLength: number = normalizedData.length;
        const size = Buffer.alloc(sizeLength);

        size.writeInt32BE(normalizedDataLength, 0);

        return Buffer.concat([ size, normalizedData, ], sizeLength + normalizedDataLength);
    }

    public decode (buffer: Buffer): void {
        const size: number | undefined = this.#size;
        let usedBuffer: Buffer = buffer;

        if (this.#tail) {
            usedBuffer = Buffer.concat([ this.#tail, usedBuffer, ], this.#tail.length + usedBuffer.length);

            this.#tail = undefined;
        }

        if (size) {
            if (usedBuffer.length >= size) {
                if (this.#decodeHandler) {
                    this.#decodeHandler(usedBuffer.slice(0, size));
                }

                this.#size = undefined;

                if (usedBuffer.length !== size) {
                    this.decode(usedBuffer.slice(size));
                }

                return;
            }
        }
        else {
            if (usedBuffer.length >= this.#sizeLength) {
                this.#size = usedBuffer.readUInt32BE(0);

                if (usedBuffer.length !== this.#sizeLength) {
                    this.decode(usedBuffer.slice(this.#sizeLength));
                }

                return;
            }
        }

        this.#tail = usedBuffer;
    }
}
