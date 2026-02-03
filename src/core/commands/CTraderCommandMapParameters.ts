/**
 * Параметры карты команд.
 */
export interface CTraderCommandMapParameters {
    /** Функция отправки сообщения на сервер */
    send: (data: Buffer) => void;
}
