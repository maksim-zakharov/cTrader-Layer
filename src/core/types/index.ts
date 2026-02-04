export type { CTraderEventMap } from "./events";
export type {
    ProtoOASpotEventPayload,
    ProtoOAExecutionEventPayload,
    ProtoOAClientDisconnectEventPayload,
    ProtoOAAccountsTokenInvalidatedEventPayload,
    ProtoOATrailingSLChangedEventPayload,
    ProtoOASymbolChangedEventPayload,
    ProtoOATraderUpdatedEventPayload,
    ProtoOAOrderErrorEventPayload,
    ProtoOAMarginChangedEventPayload,
    ProtoHeartbeatEventPayload,
} from "./events";

/**
 * Payload команд и событий cTrader.
 * Структура зависит от типа сообщения.
 */
export type CTraderPayload = Record<string, unknown>;

/**
 * Результат декодирования protobuf-сообщения.
 */
export interface CTraderDecodedMessage {
    /** Декодированный payload */
    payload: CTraderPayload;
    /** Числовой тип payload */
    payloadType: number;
    /** Идентификатор сообщения клиента */
    clientMsgId: string;
}

/**
 * Данные для кодирования (Buffer или объект с toBuffer).
 */
export type CTraderEncodable = Buffer | { toBuffer: () => Buffer };

/**
 * Обработчик события cTrader.
 */
export type CTraderEventListener = (payload: CTraderPayload) => void;
