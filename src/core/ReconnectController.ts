import type { CTraderReconnectingInfo } from "#types";
import {
    computeReconnectDelayMs,
    type CTraderReconnectHandler,
} from "#CTraderConnectionParameters";

/**
 * Параметры стратегии переподключения.
 */
export interface ReconnectControllerConfig {
    /** Максимум попыток; 0 — без лимита */
    maxReconnectAttempts: number;
    /** Базовая задержка (мс) */
    reconnectDelayMs: number;
    /** Потолок задержки (мс) */
    maxReconnectDelayMs: number;
    /** Jitter 50–100% от backoff */
    reconnectJitter: boolean;
}

/**
 * Колбэки хоста (соединения) для ReconnectController.
 */
export interface ReconnectControllerCallbacks {
    /** Закрытие по инициативе клиента */
    isClosing: () => boolean;
    /** Перевести в reconnecting / closed */
    setState: (state: "reconnecting" | "closed") => void;
    /** Событие reconnecting */
    onReconnecting: (info: CTraderReconnectingInfo) => void;
    /** Исчерпаны попытки */
    onReconnectFailed: (error: Error) => void;
    /** Успешный reconnect + handlers */
    onReconnected: () => void;
    /** Один раз эмитить close */
    onCloseOnce: () => void;
    /** Открыть сокет */
    open: () => Promise<void>;
    /** Цель для reconnect handlers (обычно this соединения) */
    getHandlerTarget: () => Parameters<CTraderReconnectHandler>[0];
}

/**
 * Таймеры, backoff/jitter и обработчики переподключения (@internal).
 */
export class ReconnectController {
    readonly #config: ReconnectControllerConfig;
    readonly #callbacks: ReconnectControllerCallbacks;
    readonly #handlers: CTraderReconnectHandler[] = [];
    #attempts = 0;
    #timeout?: ReturnType<typeof setTimeout>;

    /**
     * @param config - Лимиты и задержки
     * @param callbacks - Связь с соединением
     */
    public constructor (config: ReconnectControllerConfig, callbacks: ReconnectControllerCallbacks) {
        this.#config = config;
        this.#callbacks = callbacks;
    }

    /**
     * Сбрасывает счётчик попыток (после успешного open).
     */
    public resetAttempts (): void {
        this.#attempts = 0;
    }

    /**
     * Отменяет запланированную попытку.
     */
    public clearScheduled (): void {
        if (this.#timeout) {
            clearTimeout(this.#timeout);
            this.#timeout = undefined;
        }
    }

    /**
     * Добавляет обработчик после успешного reconnect.
     * @param handler - Auth / resubscribe
     */
    public addHandler (handler: CTraderReconnectHandler): void {
        this.#handlers.push(handler);
    }

    /**
     * Удаляет обработчик переподключения.
     * @param handler - Ранее добавленный handler
     */
    public removeHandler (handler: CTraderReconnectHandler): void {
        const index = this.#handlers.indexOf(handler);

        if (index !== -1) {
            this.#handlers.splice(index, 1);
        }
    }

    /**
     * Планирует следующую попытку переподключения.
     */
    public schedule (): void {
        if (this.#timeout !== undefined || this.#callbacks.isClosing()) {
            return;
        }

        const maxAttempts = this.#config.maxReconnectAttempts;
        const unlimited = maxAttempts === 0;

        if (!unlimited && this.#attempts >= maxAttempts) {
            this.#callbacks.setState("closed");
            this.#callbacks.onReconnectFailed(new Error(`Не удалось переподключиться после ${maxAttempts} попыток`));
            this.#callbacks.onCloseOnce();

            return;
        }

        this.#attempts += 1;
        const delayMs = computeReconnectDelayMs(this.#attempts,
            this.#config.reconnectDelayMs,
            this.#config.maxReconnectDelayMs,
            this.#config.reconnectJitter);
        const info: CTraderReconnectingInfo = {
            attempt: this.#attempts,
            maxAttempts: unlimited ? Number.POSITIVE_INFINITY : maxAttempts,
            delayMs,
        };

        this.#callbacks.onReconnecting(info);

        this.#timeout = setTimeout(() => {
            this.#timeout = undefined;
            void this.#attempt();
        }, delayMs);
    }

    async #attempt (): Promise<void> {
        if (this.#callbacks.isClosing()) {
            return;
        }

        try {
            await this.#callbacks.open();
            await this.#runHandlers();
            this.#callbacks.onReconnected();
        }
        catch {
            if (!this.#callbacks.isClosing()) {
                this.schedule();
            }
        }
    }

    async #runHandlers (): Promise<void> {
        const target = this.#callbacks.getHandlerTarget();

        for (const handler of this.#handlers) {
            await handler(target);
        }
    }
}
