/** События жизненного цикла соединения — не резолвятся в protobuf payloadType */
export const CONNECTION_EVENT_NAMES = new Set([
    "open",
    "close",
    "error",
    "reconnecting",
    "reconnected",
    "reconnectFailed",
    "stateChange",
    "unknownMessage",
]);

/** Интервал heartbeat по умолчанию (мс). Сервер рвёт соединение при тишине > 30 с */
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 25_000;

/** Таймаут ожидания ответа команды по умолчанию (мс) */
export const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;

/** Начальная задержка reconnect по умолчанию (мс) */
export const DEFAULT_RECONNECT_DELAY_MS = 1_000;

/** Максимум попыток reconnect; 0 = без лимита */
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

/** Потолок экспоненциальной задержки reconnect (мс) */
export const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;
