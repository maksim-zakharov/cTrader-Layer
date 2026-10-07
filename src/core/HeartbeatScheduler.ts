/**
 * Планировщик автоматического heartbeat (@internal).
 */
export class HeartbeatScheduler {
    #interval?: ReturnType<typeof setInterval>;
    readonly #intervalMs: number;
    readonly #onTick: () => void;

    /**
     * @param intervalMs - Интервал в мс; 0 или меньше — авто-heartbeat выключен
     * @param onTick - Колбэк отправки heartbeat
     */
    public constructor (intervalMs: number, onTick: () => void) {
        this.#intervalMs = intervalMs;
        this.#onTick = onTick;
    }

    /**
     * Запускает интервал (предыдущий останавливается).
     */
    public start (): void {
        this.stop();

        if (!this.#intervalMs || this.#intervalMs <= 0) {
            return;
        }

        this.#interval = setInterval(() => {
            this.#onTick();
        }, this.#intervalMs);

        if (typeof this.#interval.unref === "function") {
            this.#interval.unref();
        }
    }

    /**
     * Останавливает интервал.
     */
    public stop (): void {
        if (this.#interval) {
            clearInterval(this.#interval);
            this.#interval = undefined;
        }
    }
}
