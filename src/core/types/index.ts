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
    ProtoOADepthEventPayload,
    ProtoOAAccountDisconnectEventPayload,
    ProtoOAMarginCallEventPayload,
    ProtoOAv1PnLChangeEventPayload,
    ProtoOAErrorResPayload,
} from "./events";

export type {
    CTraderCommandDescriptor,
    CTraderCommandMapTypes,
    CTraderCommandRequestOf,
    CTraderCommandResponseOf,
    ProtoOAVersionReqPayload,
    ProtoOAVersionResPayload,
    ProtoOAApplicationAuthReqPayload,
    ProtoOAApplicationAuthResPayload,
    ProtoOAAccountAuthReqPayload,
    ProtoOAAccountAuthResPayload,
    ProtoOAGetAccountListByAccessTokenReqPayload,
    ProtoOAGetAccountListByAccessTokenResPayload,
    ProtoOARefreshTokenReqPayload,
    ProtoOARefreshTokenResPayload,
    ProtoOATraderReqPayload,
    ProtoOATraderResPayload,
    ProtoOAReconcileReqPayload,
    ProtoOAReconcileResPayload,
    ProtoOAGetPositionUnrealizedPnLReqPayload,
    ProtoOAGetPositionUnrealizedPnLResPayload,
    ProtoOASymbolsListReqPayload,
    ProtoOASymbolsListResPayload,
    ProtoOASymbolByIdReqPayload,
    ProtoOASymbolByIdResPayload,
    ProtoOAAssetListReqPayload,
    ProtoOAAssetListResPayload,
    ProtoOASubscribeSpotsReqPayload,
    ProtoOASubscribeSpotsResPayload,
    ProtoOAUnsubscribeSpotsReqPayload,
    ProtoOAUnsubscribeSpotsResPayload,
    ProtoOASubscribeLiveTrendbarReqPayload,
    ProtoOASubscribeLiveTrendbarResPayload,
    ProtoOAUnsubscribeLiveTrendbarReqPayload,
    ProtoOAUnsubscribeLiveTrendbarResPayload,
    ProtoOAGetTrendbarsReqPayload,
    ProtoOAGetTrendbarsResPayload,
    ProtoOASubscribeDepthQuotesReqPayload,
    ProtoOASubscribeDepthQuotesResPayload,
    ProtoOAUnsubscribeDepthQuotesReqPayload,
    ProtoOAUnsubscribeDepthQuotesResPayload,
    ProtoOANewOrderReqPayload,
    ProtoOAClosePositionReqPayload,
    ProtoOADealListReqPayload,
    ProtoOADealListResPayload,
    ProtoOACashFlowHistoryListReqPayload,
    ProtoOACashFlowHistoryListResPayload,
} from "./commands";

export type { CTraderConnectionState } from "../CTraderConnectionParameters";

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
    /** true, если payloadType отсутствует в локальных proto */
    unknown?: boolean;
}

/**
 * Данные для кодирования (Buffer или объект с toBuffer).
 */
export type CTraderEncodable = Buffer | { toBuffer: () => Buffer };

/**
 * Обработчик события cTrader.
 */
export type CTraderEventListener = (payload: CTraderPayload) => void;

/**
 * Информация о попытке переподключения.
 */
export interface CTraderReconnectingInfo {
    /** Номер текущей попытки */
    attempt: number;
    /** Максимум попыток (Infinity при безлимитном режиме) */
    maxAttempts: number;
    /** Задержка до попытки (мс) */
    delayMs: number;
}

/**
 * Неизвестное серверное сообщение.
 */
export interface CTraderUnknownMessage {
    /** Числовой тип payload */
    payloadType: number;
    /** Идентификатор сообщения клиента */
    clientMsgId: string;
    /** Пустой или частичный payload */
    payload: CTraderPayload;
}
