import { CTraderSocket } from "#sockets/CTraderSocket";

/**
 * Подмена TLS-сокета для unit-тестов соединения.
 */
export class FakeCTraderSocket extends CTraderSocket {
    /** Отправленные кадры */
    public readonly sent: Buffer[] = [];

    /** Сколько раз вызван connect */
    public connectCount = 0;

    /** Сокет уничтожен */
    public destroyed = false;

    public override connect (): void {
        this.connectCount += 1;
        this.destroyed = false;
    }

    public override close (): void {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;
        this.onClose();
    }

    public override send (buffer: Buffer): void {
        this.sent.push(buffer);
    }

    /** Имитирует успешный TLS handshake */
    public simulateOpen (): void {
        this.onOpen();
    }

    /** Имитирует обрыв соединения (событие close) */
    public simulateClose (): void {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;
        this.onClose();
    }

    /** Имитирует ошибку сокета */
    public simulateError (error: Error): void {
        this.onError(error);
    }

    /** Имитирует входящие данные */
    public simulateData (buffer: Buffer): void {
        this.onData(buffer);
    }

    /** Очищает буфер отправленных кадров */
    public clearSent (): void {
        this.sent.length = 0;
    }
}
