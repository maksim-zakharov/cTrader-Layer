/**
 * Обработчик переподключения.
 * Вызывается после успешного переподключения для повторной аутентификации и подписок.
 */
export type CTraderReconnectHandler = (connection: { sendCommand: (payloadType: string | number, data?: Record<string, unknown>) => Promise<Record<string, unknown>> }) => Promise<void>;

/**
 * Параметры соединения с cTrader Open API.
 */
export type CTraderConnectionParameters = {
    /** Хост сервера (например, demo.ctraderapi.com) */
    host: string;
    /** Порт сервера (например, 5035) */
    port: number;
    /**
     * Включить автоматическое переподключение при разрыве соединения.
     * @default false
     */
    autoReconnect?: boolean;
    /**
     * Максимальное количество попыток переподключения.
     * @default 5
     */
    maxReconnectAttempts?: number;
    /**
     * Начальная задержка между попытками переподключения (мс).
     * Используется экспоненциальный backoff.
     * @default 1000
     */
    reconnectDelayMs?: number;
};
