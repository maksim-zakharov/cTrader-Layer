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

    /**
     * Устанавливает соединение с сервером.
     */
    public connect (): void {
        // @ts-ignore
        const socket = tls.connect(this.#port, this.#host, (): void => this.onOpen());

        socket.on("data", (data: Buffer): void => this.onData(data));
        socket.on("end", (): void => this.onClose());
        socket.on("error", (err: Error): void => this.onError(err));

        this.#socket = socket;
    }

    /**
     * Закрывает соединение.
     */
    public close (): void {
        if (this.#socket) {
            this.#socket.destroy();
            this.#socket = undefined;
        }
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

    public onData (_data: Buffer): void {
        // Silence is golden.
    }

    public onClose (): void {
        // Silence is golden.
    }

    public onError (_err: Error): void {
        // Silence is golden.
    }
}
