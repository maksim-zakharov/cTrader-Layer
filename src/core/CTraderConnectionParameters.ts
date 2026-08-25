import type { CTraderPayload } from "#types";
import type { CTraderProtobufReader } from "#protobuf/CTraderProtobufReader";
import type { CTraderSocket } from "#sockets/CTraderSocket";
import {
    DEFAULT_COMMAND_TIMEOUT_MS,
    DEFAULT_HEARTBEAT_INTERVAL_MS,
    DEFAULT_MAX_RECONNECT_ATTEMPTS,
    DEFAULT_MAX_RECONNECT_DELAY_MS,
    DEFAULT_RECONNECT_DELAY_MS,
} from "#connection.constants";

/**
 * Состояние жизненного цикла соединения.
 */
export type CTraderConnectionState =
    | "idle"
    | "connecting"
    | "open"
    | "reconnecting"
    | "closed";

/**
 * Обработчик переподключения.
 * Вызывается после успешного переподключения для повторной аутентификации и подписок.
 */
export type CTraderReconnectHandler = (connection: {
    sendCommand: (payloadType: string | number, data?: CTraderPayload) => Promise<CTraderPayload>;
}) => Promise<void>;

/**
 * Подмены зависимостей. Используются в тестах, в проде не нужны.
 */
export interface CTraderConnectionDependencies {
    /** Подмена TLS-сокета */
    socket?: CTraderSocket;
    /** Подмена protobuf-ридера */
    protobufReader?: CTraderProtobufReader;
}

/**
 * Параметры соединения с cTrader Open API.
 */
export type CTraderConnectionParameters = {
    /** Хост сервера (например, demo.ctraderapi.com) */
    host: string;
    /** Порт сервера (например, 5035) */
    port: number;
    /**
     * Включить автоматическое переподключение при разрыве соединения.
     * @default false
     */
    autoReconnect?: boolean;
    /**
     * Максимальное количество попыток переподключения.
     * 0 — без лимита.
     * @default 5
     */
    maxReconnectAttempts?: number;
    /**
     * Начальная задержка между попытками переподключения (мс).
     * Используется экспоненциальный backoff.
     * @default 1000
     */
    reconnectDelayMs?: number;
    /**
     * Потолок задержки reconnect (мс).
     * @default 30000
     */
    maxReconnectDelayMs?: number;
    /**
     * Добавлять jitter к задержке reconnect (50–100% от backoff).
     * @default true
     */
    reconnectJitter?: boolean;
    /**
     * Таймаут ожидания ответа команды (мс). 0 — без таймаута.
     * @default 30000
     */
    commandTimeoutMs?: number;
    /**
     * Интервал автоматического heartbeat (мс). 0 — выключить авто-heartbeat.
     * @default 25000
     */
    heartbeatIntervalMs?: number;
    /**
     * Таймаут TLS-сокета (мс). 0 — без таймаута.
     */
    tlsTimeoutMs?: number;
    /**
     * Каталог с proto-файлами Spotware.
     */
    protoDir?: string;
    /**
     * Один повтор команды при BLOCKED_PAYLOAD_TYPE после ожидания retryAfter.
     * @default false
     */
    rateLimitRetry?: boolean;
};

/**
 * Нормализует параметры соединения, подставляя значения по умолчанию.
 * @param parameters - Входные параметры
 */
export function normalizeConnectionParameters (parameters: CTraderConnectionParameters): Required<Pick<CTraderConnectionParameters,
    "autoReconnect"
    | "maxReconnectAttempts"
    | "reconnectDelayMs"
    | "maxReconnectDelayMs"
    | "reconnectJitter"
    | "commandTimeoutMs"
    | "heartbeatIntervalMs"
    | "rateLimitRetry"
>> & CTraderConnectionParameters {
    return {
        ...parameters,
        autoReconnect: parameters.autoReconnect ?? false,
        maxReconnectAttempts: parameters.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
        reconnectDelayMs: parameters.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS,
        maxReconnectDelayMs: parameters.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS,
        reconnectJitter: parameters.reconnectJitter ?? true,
        commandTimeoutMs: parameters.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
        heartbeatIntervalMs: parameters.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
        rateLimitRetry: parameters.rateLimitRetry ?? false,
    };
}

/**
 * Считает задержку следующей попытки reconnect.
 * @param attempt - Номер попытки (начиная с 1)
 * @param delayMs - Базовая задержка
 * @param maxDelayMs - Потолок
 * @param jitter - Включить jitter
 */
export function computeReconnectDelayMs (attempt: number,
    delayMs: number,
    maxDelayMs: number,
    jitter: boolean): number {
    const exponential = delayMs * Math.pow(2, Math.max(0, attempt - 1));
    const capped = Math.min(exponential, maxDelayMs);

    if (!jitter) {
        return capped;
    }

    return Math.floor(capped * (0.5 + Math.random() * 0.5));
}
