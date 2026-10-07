import type { CTraderPayload } from "./index";
import type { ProtoOAExecutionEventPayload } from "./events";

/**
 * Дескриптор команды: тип запроса и ответа.
 */
export interface CTraderCommandDescriptor<
    TReq extends CTraderPayload = CTraderPayload,
    TRes extends CTraderPayload = CTraderPayload,
> {
    /** Payload запроса (*Req) */
    request: TReq;
    /** Payload ответа (*Res или ExecutionEvent) */
    response: TRes;
}

/** Запрос ProtoOAVersionReq */
export interface ProtoOAVersionReqPayload extends CTraderPayload {}

/** Ответ ProtoOAVersionRes */
export interface ProtoOAVersionResPayload extends CTraderPayload {
    /** Версия серверного приложения */
    version?: string;
}

/** Запрос ProtoOAApplicationAuthReq */
export interface ProtoOAApplicationAuthReqPayload extends CTraderPayload {
    /** Client ID приложения */
    clientId?: string;
    /** Client Secret приложения */
    clientSecret?: string;
}

/** Ответ ProtoOAApplicationAuthRes */
export interface ProtoOAApplicationAuthResPayload extends CTraderPayload {}

/** Запрос ProtoOAAccountAuthReq */
export interface ProtoOAAccountAuthReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Access token */
    accessToken?: string;
}

/** Ответ ProtoOAAccountAuthRes */
export interface ProtoOAAccountAuthResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Запрос ProtoOAGetAccountListByAccessTokenReq */
export interface ProtoOAGetAccountListByAccessTokenReqPayload extends CTraderPayload {
    /** Access token */
    accessToken?: string;
}

/** Ответ ProtoOAGetAccountListByAccessTokenRes */
export interface ProtoOAGetAccountListByAccessTokenResPayload extends CTraderPayload {
    /** Access token */
    accessToken?: string;
    /** SCOPE_VIEW / SCOPE_TRADE */
    permissionScope?: number;
    /** Список счетов */
    ctidTraderAccount?: CTraderPayload[];
}

/** Запрос ProtoOARefreshTokenReq */
export interface ProtoOARefreshTokenReqPayload extends CTraderPayload {
    /** Refresh token */
    refreshToken?: string;
}

/** Ответ ProtoOARefreshTokenRes */
export interface ProtoOARefreshTokenResPayload extends CTraderPayload {
    /** Новый access token */
    accessToken?: string;
    /** Тип токена (bearer) */
    tokenType?: string;
    /** Срок жизни access token (сек) */
    expiresIn?: number;
    /** Новый refresh token */
    refreshToken?: string;
}

/** Запрос ProtoOATraderReq */
export interface ProtoOATraderReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Ответ ProtoOATraderRes */
export interface ProtoOATraderResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Данные трейдера */
    trader?: CTraderPayload;
}

/** Запрос ProtoOAReconcileReq */
export interface ProtoOAReconcileReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Возвращать protection-ордера отдельно */
    returnProtectionOrders?: boolean;
}

/** Ответ ProtoOAReconcileRes */
export interface ProtoOAReconcileResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Открытые позиции */
    position?: CTraderPayload[];
    /** Отложенные ордера */
    order?: CTraderPayload[];
}

/** Запрос ProtoOAGetPositionUnrealizedPnLReq */
export interface ProtoOAGetPositionUnrealizedPnLReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Ответ ProtoOAGetPositionUnrealizedPnLRes */
export interface ProtoOAGetPositionUnrealizedPnLResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** PnL по позициям */
    positionUnrealizedPnL?: CTraderPayload[];
    /** Экспонента денежных значений */
    moneyDigits?: number;
}

/** Запрос ProtoOASymbolsListReq */
export interface ProtoOASymbolsListReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Включать архивные символы */
    includeArchivedSymbols?: boolean;
}

/** Ответ ProtoOASymbolsListRes */
export interface ProtoOASymbolsListResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Список символов (light) */
    symbol?: CTraderPayload[];
    /** Архивные символы */
    archivedSymbol?: CTraderPayload[];
}

/** Запрос ProtoOASymbolByIdReq */
export interface ProtoOASymbolByIdReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификаторы символов */
    symbolId?: number[];
}

/** Ответ ProtoOASymbolByIdRes */
export interface ProtoOASymbolByIdResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Полные сущности символов */
    symbol?: CTraderPayload[];
    /** Архивные символы */
    archivedSymbol?: CTraderPayload[];
}

/** Запрос ProtoOAAssetListReq */
export interface ProtoOAAssetListReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Ответ ProtoOAAssetListRes */
export interface ProtoOAAssetListResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Список активов */
    asset?: CTraderPayload[];
}

/** Запрос ProtoOASubscribeSpotsReq */
export interface ProtoOASubscribeSpotsReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификаторы символов */
    symbolId?: number[];
    /** Добавлять timestamp в spot-события */
    subscribeToSpotTimestamp?: boolean;
}

/** Ответ ProtoOASubscribeSpotsRes */
export interface ProtoOASubscribeSpotsResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Запрос ProtoOAUnsubscribeSpotsReq */
export interface ProtoOAUnsubscribeSpotsReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификаторы символов */
    symbolId?: number[];
}

/** Ответ ProtoOAUnsubscribeSpotsRes */
export interface ProtoOAUnsubscribeSpotsResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Запрос ProtoOASubscribeLiveTrendbarReq */
export interface ProtoOASubscribeLiveTrendbarReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Период трендбара */
    period?: number;
    /** Идентификатор символа */
    symbolId?: number;
}

/** Ответ ProtoOASubscribeLiveTrendbarRes */
export interface ProtoOASubscribeLiveTrendbarResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Запрос ProtoOAUnsubscribeLiveTrendbarReq */
export interface ProtoOAUnsubscribeLiveTrendbarReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Период трендбара */
    period?: number;
    /** Идентификатор символа */
    symbolId?: number;
}

/** Ответ ProtoOAUnsubscribeLiveTrendbarRes */
export interface ProtoOAUnsubscribeLiveTrendbarResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Запрос ProtoOAGetTrendbarsReq */
export interface ProtoOAGetTrendbarsReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Начало периода (unix ms) */
    fromTimestamp?: number;
    /** Конец периода (unix ms) */
    toTimestamp?: number;
    /** Период трендбара */
    period?: number;
    /** Идентификатор символа */
    symbolId?: number;
    /** Лимит баров */
    count?: number;
}

/** Ответ ProtoOAGetTrendbarsRes */
export interface ProtoOAGetTrendbarsResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Период трендбара */
    period?: number;
    /** Исторические трендбары */
    trendbar?: CTraderPayload[];
    /** Идентификатор символа */
    symbolId?: number;
    /** Есть ещё данные за фильтром */
    hasMore?: boolean;
}

/** Запрос ProtoOASubscribeDepthQuotesReq */
export interface ProtoOASubscribeDepthQuotesReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификаторы символов */
    symbolId?: number[];
}

/** Ответ ProtoOASubscribeDepthQuotesRes */
export interface ProtoOASubscribeDepthQuotesResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Запрос ProtoOAUnsubscribeDepthQuotesReq */
export interface ProtoOAUnsubscribeDepthQuotesReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификаторы символов */
    symbolId?: number[];
}

/** Ответ ProtoOAUnsubscribeDepthQuotesRes */
export interface ProtoOAUnsubscribeDepthQuotesResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/** Запрос ProtoOANewOrderReq */
export interface ProtoOANewOrderReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификатор символа */
    symbolId?: number;
    /** Тип ордера */
    orderType?: number;
    /** Сторона сделки */
    tradeSide?: number;
    /** Объём */
    volume?: number;
}

/** Запрос ProtoOAClosePositionReq */
export interface ProtoOAClosePositionReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификатор позиции */
    positionId?: number;
    /** Объём закрытия */
    volume?: number;
}

/** Запрос ProtoOADealListReq */
export interface ProtoOADealListReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Начало периода (unix ms) */
    fromTimestamp?: number;
    /** Конец периода (unix ms) */
    toTimestamp?: number;
    /** Максимум записей */
    maxRows?: number;
}

/** Ответ ProtoOADealListRes */
export interface ProtoOADealListResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Список сделок */
    deal?: CTraderPayload[];
    /** Есть ещё данные */
    hasMore?: boolean;
}

/** Запрос ProtoOACashFlowHistoryListReq */
export interface ProtoOACashFlowHistoryListReqPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Начало периода (unix ms) */
    fromTimestamp?: number;
    /** Конец периода (unix ms) */
    toTimestamp?: number;
}

/** Ответ ProtoOACashFlowHistoryListRes */
export interface ProtoOACashFlowHistoryListResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Депозиты / выводы */
    depositWithdraw?: CTraderPayload[];
}

/**
 * Карта команд Open API: имя *Req → { request, response }.
 * Расширяйте через module augmentation:
 *
 * @example
 * declare module '@max89701/ctrader-layer' {
 *   interface CTraderCommandMapTypes {
 *     MyCustomReq: CTraderCommandDescriptor<{ id?: number }, { ok?: boolean }>;
 *   }
 * }
 */
export interface CTraderCommandMapTypes {
    ProtoOAVersionReq: CTraderCommandDescriptor<ProtoOAVersionReqPayload, ProtoOAVersionResPayload>;
    ProtoOAApplicationAuthReq: CTraderCommandDescriptor<
        ProtoOAApplicationAuthReqPayload,
        ProtoOAApplicationAuthResPayload
    >;
    ProtoOAAccountAuthReq: CTraderCommandDescriptor<
        ProtoOAAccountAuthReqPayload,
        ProtoOAAccountAuthResPayload
    >;
    ProtoOAGetAccountListByAccessTokenReq: CTraderCommandDescriptor<
        ProtoOAGetAccountListByAccessTokenReqPayload,
        ProtoOAGetAccountListByAccessTokenResPayload
    >;
    ProtoOARefreshTokenReq: CTraderCommandDescriptor<
        ProtoOARefreshTokenReqPayload,
        ProtoOARefreshTokenResPayload
    >;
    ProtoOATraderReq: CTraderCommandDescriptor<ProtoOATraderReqPayload, ProtoOATraderResPayload>;
    ProtoOAReconcileReq: CTraderCommandDescriptor<
        ProtoOAReconcileReqPayload,
        ProtoOAReconcileResPayload
    >;
    ProtoOAGetPositionUnrealizedPnLReq: CTraderCommandDescriptor<
        ProtoOAGetPositionUnrealizedPnLReqPayload,
        ProtoOAGetPositionUnrealizedPnLResPayload
    >;
    ProtoOASymbolsListReq: CTraderCommandDescriptor<
        ProtoOASymbolsListReqPayload,
        ProtoOASymbolsListResPayload
    >;
    ProtoOASymbolByIdReq: CTraderCommandDescriptor<
        ProtoOASymbolByIdReqPayload,
        ProtoOASymbolByIdResPayload
    >;
    ProtoOAAssetListReq: CTraderCommandDescriptor<
        ProtoOAAssetListReqPayload,
        ProtoOAAssetListResPayload
    >;
    ProtoOASubscribeSpotsReq: CTraderCommandDescriptor<
        ProtoOASubscribeSpotsReqPayload,
        ProtoOASubscribeSpotsResPayload
    >;
    ProtoOAUnsubscribeSpotsReq: CTraderCommandDescriptor<
        ProtoOAUnsubscribeSpotsReqPayload,
        ProtoOAUnsubscribeSpotsResPayload
    >;
    ProtoOASubscribeLiveTrendbarReq: CTraderCommandDescriptor<
        ProtoOASubscribeLiveTrendbarReqPayload,
        ProtoOASubscribeLiveTrendbarResPayload
    >;
    ProtoOAUnsubscribeLiveTrendbarReq: CTraderCommandDescriptor<
        ProtoOAUnsubscribeLiveTrendbarReqPayload,
        ProtoOAUnsubscribeLiveTrendbarResPayload
    >;
    ProtoOAGetTrendbarsReq: CTraderCommandDescriptor<
        ProtoOAGetTrendbarsReqPayload,
        ProtoOAGetTrendbarsResPayload
    >;
    ProtoOASubscribeDepthQuotesReq: CTraderCommandDescriptor<
        ProtoOASubscribeDepthQuotesReqPayload,
        ProtoOASubscribeDepthQuotesResPayload
    >;
    ProtoOAUnsubscribeDepthQuotesReq: CTraderCommandDescriptor<
        ProtoOAUnsubscribeDepthQuotesReqPayload,
        ProtoOAUnsubscribeDepthQuotesResPayload
    >;
    /** Ответ — ProtoOAExecutionEvent */
    ProtoOANewOrderReq: CTraderCommandDescriptor<
        ProtoOANewOrderReqPayload,
        ProtoOAExecutionEventPayload
    >;
    /** Ответ — ProtoOAExecutionEvent */
    ProtoOAClosePositionReq: CTraderCommandDescriptor<
        ProtoOAClosePositionReqPayload,
        ProtoOAExecutionEventPayload
    >;
    ProtoOADealListReq: CTraderCommandDescriptor<
        ProtoOADealListReqPayload,
        ProtoOADealListResPayload
    >;
    ProtoOACashFlowHistoryListReq: CTraderCommandDescriptor<
        ProtoOACashFlowHistoryListReqPayload,
        ProtoOACashFlowHistoryListResPayload
    >;
}

/** Тип запроса команды по имени *Req */
export type CTraderCommandRequestOf<K extends keyof CTraderCommandMapTypes> =
    CTraderCommandMapTypes[K]["request"];

/** Тип ответа команды по имени *Req */
export type CTraderCommandResponseOf<K extends keyof CTraderCommandMapTypes> =
    CTraderCommandMapTypes[K]["response"];
