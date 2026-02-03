import * as tls from "tls";
import { CTraderSocketParameters } from "#sockets/CTraderSocketParameters";

/**
 * TLS-сокет для соединения с cTrader Open API.
 * Оборачивает Node.js tls.connect для работы с протоколом cTrader.
 */
export class CTraderSocket {
    readonly #host: string;
    readonly #port: number;
    #socket?: tls.TLSSocket;

    /**
     * Создаёт экземпляр сокета.
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
     * Колбэки onOpen, onData, onClose, onError должны быть назначены до вызова connect.
     */
    public connect (): void {
        const socket = tls.connect(
            { port: this.#port, host: this.#host, servername: this.#host, },
            (): void => this.onOpen(),
        );

        socket.on("data", (data: Buffer): void => this.onData(data));
        socket.on("end", (): void => this.onClose());
        socket.on("error", (err: Error): void => this.onError(err));

        this.#socket = socket;
    }

    /**
     * Отправляет данные в сокет.
     * @param buffer - Буфер для отправки
     */
    public send (buffer: Buffer): void {
        this.#socket?.write(buffer);
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

    /** Проверяет, установлено ли соединение */
    public get isConnected (): boolean {
        return this.#socket !== undefined && !this.#socket.destroyed;
    }

    /** Колбэк при успешном установлении соединения */
    public onOpen (): void {
        // Silence is golden.
    }

    /** Колбэк при получении данных */
    public onData (_data: Buffer): void {
        // Silence is golden.
    }

    /** Колбэк при закрытии соединения */
    public onClose (): void {
        // Silence is golden.
    }

    /** Колбэк при ошибке соединения */
    public onError (_err: Error): void {
        // Silence is golden.
    }
}
