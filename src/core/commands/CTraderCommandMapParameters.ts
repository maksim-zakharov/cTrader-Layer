import type { CTraderEncodable } from "#types";

/**
 * Параметры карты команд.
 */
export type CTraderCommandMapParameters = {
    /** Функция отправки сообщения на сервер */
    send: (data: CTraderEncodable) => void;
};
