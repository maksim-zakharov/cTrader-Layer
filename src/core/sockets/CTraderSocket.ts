import * as tls from "tls";
import { CTraderSocketParameters } from "#sockets/CTraderSocketParameters";

/**
 * TLS-сокет для соединения с cTrader Open API.
 */
export class CTraderSocket {
    readonly #host: string;
    readonly #port: number;
    readonly #timeoutMs?: number;
    #socket?: tls.TLSSocket;

    /**
     * @param parameters - Параметры подключения (host, port, timeoutMs)
     */
    public constructor ({
        host, port, timeoutMs,
    }: CTraderSocketParameters) {
        this.#host = host;
        this.#port = port;
        this.#timeoutMs = timeoutMs;
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
     * Предыдущий сокет уничтожается без события close (замена при reconnect).
     */
    public connect (): void {
        this.#destroySilent();

        const socket = tls.connect({
            host: this.#host,
            port: this.#port,
            servername: this.#host,
        }, (): void => this.onOpen());

        socket.on("data", (data: Buffer): void => this.onData(data));
        socket.on("error", (err: Error): void => this.onError(err));
        socket.on("close", (): void => {
            if (this.#socket === socket) {
                this.#socket = undefined;
                this.onClose();
            }
        });

        if (this.#timeoutMs && this.#timeoutMs > 0) {
            socket.setTimeout(this.#timeoutMs);
            socket.on("timeout", (): void => {
                socket.destroy(new Error("Таймаут TLS-соединения"));
            });
        }

        this.#socket = socket;
    }

    /**
     * Закрывает соединение. Событие close сокета пробрасывается в onClose.
     */
    public close (): void {
        this.#socket?.destroy();
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

    #destroySilent (): void {
        if (!this.#socket) {
            return;
        }

        this.#socket.removeAllListeners();
        this.#socket.destroy();
        this.#socket = undefined;
    }
}
