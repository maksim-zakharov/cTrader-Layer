/**
 * Payload события от сервера cTrader Open API.
 * Структура зависит от типа события (ProtoOAExecutionEvent, ProtoOASpotEvent и т.д.).
 */
export interface CTraderEventPayload {
    /** Код ошибки, если есть */
    errorCode?: string | number;
    /** Дополнительные поля в зависимости от типа события */
    [key: string]: unknown;
}

/**
 * Обработчик события cTrader.
 * @param payload - Данные события от сервера
 */
export type CTraderEventListener<T extends CTraderEventPayload = CTraderEventPayload> = (payload: T) => void;

/** Параметры для sendCommand в обработчике переподключения */
export interface CTraderReconnectConnection {
    sendCommand: (payloadType: string | number, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * Обработчик переподключения.
 * Вызывается после успешного переподключения для повторной аутентификации и подписок.
 * @param connection - Экземпляр соединения для отправки команд
 */
export type CTraderReconnectHandler = (connection: CTraderReconnectConnection) => Promise<void>;
