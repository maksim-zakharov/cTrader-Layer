import type { CTraderPayload } from "./index";

/**
 * Payload события ProtoOASpotEvent.
 * Событие котировок символа (bid, ask). Живые трендбары приходят в trendbar.
 */
export interface ProtoOASpotEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификатор символа */
    symbolId?: number;
    /** Цена bid (в 1/100000 единицы) */
    bid?: number;
    /** Цена ask (в 1/100000 единицы) */
    ask?: number;
    /** Живые трендбары при подписке на live trendbar */
    trendbar?: CTraderPayload[];
    /** Цена закрытия сессии */
    sessionClose?: number;
    /** Unix-время для spot */
    timestamp?: number;
}

/**
 * Payload события ProtoOAExecutionEvent.
 * Событие исполнения ордера или операции.
 */
export interface ProtoOAExecutionEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Тип исполнения (ACCEPTED, FILLED и т.д.) */
    executionType?: number;
    /** Код ошибки при неудаче */
    errorCode?: string | number;
    /** Событие сгенерировано сервером (например, stop-out) */
    isServerEvent?: boolean;
}

/**
 * Payload события ProtoOAClientDisconnectEvent.
 * Событие отключения клиента сервером.
 */
export interface ProtoOAClientDisconnectEventPayload extends CTraderPayload {
    /** Причина отключения */
    reason?: string;
}

/**
 * Payload события ProtoOAAccountsTokenInvalidatedEvent.
 * Событие инвалидации токена для аккаунтов.
 */
export interface ProtoOAAccountsTokenInvalidatedEventPayload extends CTraderPayload {
    /** Идентификаторы торговых счетов */
    ctidTraderAccountIds?: number[];
    /** Причина инвалидации */
    reason?: string;
}

/**
 * Payload события ProtoOATrailingSLChangedEvent.
 * Событие изменения уровня Trailing Stop Loss.
 */
export interface ProtoOATrailingSLChangedEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификатор позиции */
    positionId?: number;
    /** Идентификатор ордера */
    orderId?: number;
    /** Новое значение Stop Loss */
    stopPrice?: number;
    /** Время последнего обновления */
    utcLastUpdateTimestamp?: number;
}

/**
 * Payload события ProtoOASymbolChangedEvent.
 * Событие изменения символа.
 */
export interface ProtoOASymbolChangedEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификатор символа */
    symbolId?: number;
}

/**
 * Payload события ProtoOATraderUpdatedEvent.
 * Событие обновления данных трейдера.
 */
export interface ProtoOATraderUpdatedEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/**
 * Payload события ProtoOAOrderErrorEvent.
 * Событие ошибки ордера.
 */
export interface ProtoOAOrderErrorEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Код ошибки */
    errorCode?: string | number;
    /** Идентификатор ордера */
    orderId?: number;
}

/**
 * Payload события ProtoOAMarginChangedEvent.
 * Событие изменения маржи.
 */
export interface ProtoOAMarginChangedEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/**
 * Payload события ProtoHeartbeatEvent.
 * Heartbeat для поддержания соединения. Полей в proto нет.
 */
export interface ProtoHeartbeatEventPayload extends CTraderPayload {}

/**
 * Payload события ProtoOADepthEvent (стакан).
 */
export interface ProtoOADepthEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Идентификатор символа */
    symbolId?: number;
    /** Новые/изменённые котировки стакана */
    newQuotes?: CTraderPayload[];
    /** Идентификаторы котировок к удалению */
    deletedQuotes?: number[];
}

/**
 * Payload события ProtoOAAccountDisconnectEvent.
 */
export interface ProtoOAAccountDisconnectEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
}

/**
 * Payload события ProtoOAMarginCallUpdateEvent / ProtoOAMarginCallTriggerEvent.
 */
export interface ProtoOAMarginCallEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Порог маржин-колла */
    marginCall?: CTraderPayload;
}

/**
 * Payload события ProtoOAv1PnLChangeEvent.
 */
export interface ProtoOAv1PnLChangeEventPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Валовый нереализованный PnL */
    grossUnrealizedPnL?: number;
    /** Чистый нереализованный PnL */
    netUnrealizedPnL?: number;
    /** Экспонента денежных значений */
    moneyDigits?: number;
}

/**
 * Payload ProtoOAErrorRes, пришедшего без clientMsgId (push).
 */
export interface ProtoOAErrorResPayload extends CTraderPayload {
    /** Идентификатор торгового счёта */
    ctidTraderAccountId?: number;
    /** Код ошибки */
    errorCode?: string | number;
    /** Описание */
    description?: string;
    /** Конец обслуживания (unix sec) */
    maintenanceEndTimestamp?: number;
    /** Секунд до разблокировки payload type */
    retryAfter?: number;
}

/**
 * Маппинг имён событий cTrader на типы payload.
 * Расширяйте через module augmentation для добавления своих типов:
 *
 * @example
 * declare module '@max89701/ctrader-layer' {
 *   interface CTraderEventMap {
 *     MyCustomEvent: { customField: string };
 *   }
 * }
 */
export interface CTraderEventMap {
    ProtoOASpotEvent: ProtoOASpotEventPayload;
    ProtoOAExecutionEvent: ProtoOAExecutionEventPayload;
    ProtoOAClientDisconnectEvent: ProtoOAClientDisconnectEventPayload;
    ProtoOAAccountsTokenInvalidatedEvent: ProtoOAAccountsTokenInvalidatedEventPayload;
    ProtoOATrailingSLChangedEvent: ProtoOATrailingSLChangedEventPayload;
    ProtoOASymbolChangedEvent: ProtoOASymbolChangedEventPayload;
    ProtoOATraderUpdatedEvent: ProtoOATraderUpdatedEventPayload;
    ProtoOAOrderErrorEvent: ProtoOAOrderErrorEventPayload;
    ProtoOAMarginChangedEvent: ProtoOAMarginChangedEventPayload;
    ProtoHeartbeatEvent: ProtoHeartbeatEventPayload;
    ProtoOADepthEvent: ProtoOADepthEventPayload;
    ProtoOAAccountDisconnectEvent: ProtoOAAccountDisconnectEventPayload;
    ProtoOAMarginCallUpdateEvent: ProtoOAMarginCallEventPayload;
    ProtoOAMarginCallTriggerEvent: ProtoOAMarginCallEventPayload;
    ProtoOAv1PnLChangeEvent: ProtoOAv1PnLChangeEventPayload;
    ProtoOAErrorRes: ProtoOAErrorResPayload;
}
