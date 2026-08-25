/**
 * Параметры TLS-сокета для cTrader.
 */
export type CTraderSocketParameters = {
    /** Хост сервера */
    host: string;
    /** Порт сервера */
    port: number;
    /** Таймаут сокета (мс). 0 или undefined — без таймаута */
    timeoutMs?: number;
};
