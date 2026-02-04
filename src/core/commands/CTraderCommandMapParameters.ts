/**
 * Параметры карты команд.
 */
export type CTraderCommandMapParameters = {
    /** Функция отправки сообщения на сервер */
    send: (...parameters: any[]) => void;
};
