/**
 * Параметры команды.
 */
export type CTraderCommandParameters = {
    /** Идентификатор сообщения клиента */
    clientMsgId: string;
    /** Таймаут ожидания ответа (мс). 0 или undefined — без таймаута */
    timeoutMs?: number;
    /** Колбэк при срабатывании таймаута (удаление из карты) */
    onTimeout?: () => void;
};
