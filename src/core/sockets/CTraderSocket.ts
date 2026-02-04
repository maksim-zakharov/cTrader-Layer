import * as tls from "tls";
import { CTraderSocketParameters } from "#sockets/CTraderSocketParameters";

/**
 * TLS-сокет для соединения с cTrader Open API.
 */
export class CTraderSocket {
    readonly #host: string;
    readonly #port: number;
    #socket?: tls.TLSSocket;

    /**
     * @param parameters - Параметры подключения (host, port)
     */
    public constructor ({ host, port, }: CTraderSocketParameters) {
        this.#host = host;
        this.#port = port;
        this.#socket = undefined;
    }

    /** Хост сервера */
    public get host (): string {
        return this.#host;
    }

    /** Порт сервера */
    public get port (): number {
        return this.#port;
    }

    public connect (): void {
        // @ts-ignore
        const socket = tls.connect(this.#port, this.#host, this.onOpen);

        socket.on("data", this.onData);
        socket.on("end", this.onClose);
        socket.on("error", this.onError);

        this.#socket = socket;
    }

    /**
     * Отправляет данные в сокет.
     * @param buffer - Буфер для отправки
     */
    public send (buffer: Buffer): void {
        this.#socket?.write(buffer);
    }

    public onOpen (): void {
        // Silence is golden.
    }

    public onData (...parameters: any[]): void {
        // Silence is golden.
    }

    public onClose (): void {
        // Silence is golden.
    }

    public onError (): void {
        // Silence is golden.
    }
}
