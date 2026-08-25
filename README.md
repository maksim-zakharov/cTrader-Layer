# cTrader Layer

Node.js слой для работы с [cTrader Open API](https://help.ctrader.com/open-api/).<br>
Форк [Reiryoku ctrader-layer](https://github.com/reiryoku-trader/ctrader-layer).

## Установка

```bash
npm install @max89701/ctrader-layer
```

Требуется **Node.js 14.17+**.

## Использование

Подробная документация по cTrader Open API: [Open API Documentation](https://help.ctrader.com/open-api/).

### Подключение к серверу

```javascript
const { CTraderConnection } = require("@max89701/ctrader-layer");

const connection = new CTraderConnection({
    host: "demo.ctraderapi.com",
    port: 5035,
});

await connection.open();
console.log(connection.isOpen, connection.state); // true, "open"
```

Heartbeat отправляется **автоматически каждые 25 секунд** (сервер рвёт соединение при тишине > 30 с). Отключить: `heartbeatIntervalMs: 0`.

### Отправка команд

Метод `sendCommand` отправляет команду и возвращает `Promise`, который разрешается при получении ответа от сервера. По умолчанию ответ ждут **30 секунд**, иначе промис отклоняется с `errorCode: "COMMAND_TIMEOUT"`.

```javascript
const response = await connection.sendCommand("ProtoOAVersionReq", {});
console.log(response.version);
```

### Обработка ошибок

При ошибке Open API, таймауте или закрытии соединения промис отклоняется экземпляром `CTraderCommandError` (это `Error` с полями `errorCode`, `description`, `retryAfter`).

```javascript
const { CTraderCommandError } = require("@max89701/ctrader-layer");

try {
    await connection.sendCommand("ProtoOANewOrderReq", { /* ... */ });
} catch (error) {
    if (error instanceof CTraderCommandError) {
        console.error("Ошибка:", error.errorCode, error.description, error.retryAfter);
    }
}

// Без выброса CTraderCommandError:
const result = await connection.trySendCommand("ProtoOANewOrderReq", {});
if (result === undefined) {
    console.log("Команда не выполнена");
}
```

Один повтор после `BLOCKED_PAYLOAD_TYPE`: `rateLimitRetry: true`.

### Аутентификация приложения

```javascript
await connection.sendCommand("ProtoOAApplicationAuthReq", {
    clientId: "your-client-id",
    clientSecret: "your-client-secret",
});
```

### Аутентификация аккаунта

```javascript
await connection.sendCommand("ProtoOAAccountAuthReq", {
    ctidTraderAccountId: 12345678,
    accessToken: "your-access-token",
});
```

### Heartbeat

Автоматический интервал задаётся `heartbeatIntervalMs` (по умолчанию 25000). Ручной вызов не создаёт висящую команду:

```javascript
connection.sendHeartbeat();
```

### Переподключение и переподписки

При разрыве TLS (в том числе `ECONNRESET` / событие `close`) можно включить автоматическое переподключение с повторной аутентификацией и подписками:

```javascript
const { CTraderConnection } = require("@max89701/ctrader-layer");

const connection = new CTraderConnection({
    host: "demo.ctraderapi.com",
    port: 5035,
    autoReconnect: true,
    maxReconnectAttempts: 0, // 0 = без лимита; по умолчанию 5
    reconnectDelayMs: 1000,
    maxReconnectDelayMs: 30000,
});

connection.addReconnectHandler(async (conn) => {
    await conn.sendCommand("ProtoOAApplicationAuthReq", {
        clientId: "your-client-id",
        clientSecret: "your-client-secret",
    });
    await conn.sendCommand("ProtoOAAccountAuthReq", {
        ctidTraderAccountId: 12345678,
        accessToken: "your-access-token",
    });
    await conn.sendCommand("ProtoOASubscribeSpotsReq", {
        ctidTraderAccountId: 12345678,
        symbolId: [1, 2, 3],
    });
});

connection.on("reconnected", () => {
    console.log("Переподключение выполнено");
});

connection.on("reconnectFailed", (err) => {
    console.error("Не удалось переподключиться:", err);
});
```

После исчерпания попыток эмитятся и `reconnectFailed`, и `close`.

### Закрытие соединения

```javascript
connection.close();
```

### Подписка на события

События можно подписывать по имени сообщения или по числовому `payloadType`.
`on` / `off` / `once` / `removeListener` нормализуют имя в payloadType. События жизненного цикла (`open`, `close`, `error`, …) не ищутся в proto.

```typescript
import { CTraderConnection } from "@max89701/ctrader-layer";

connection.on("ProtoOASpotEvent", (payload) => {
    console.log("Спот:", payload.bid, payload.ask);
});

connection.on("ProtoOADepthEvent", (payload) => {
    console.log("Стакан:", payload.symbolId);
});

connection.on("unknownMessage", ({ payloadType }) => {
    console.warn("Неизвестный payloadType", payloadType);
});

const onSpot = (payload) => { /* ... */ };
connection.on("ProtoOASpotEvent", onSpot);
connection.off("ProtoOASpotEvent", onSpot);
```

Для расширения маппинга используйте module augmentation:

```typescript
declare module "@max89701/ctrader-layer" {
    interface CTraderEventMap {
        MyCustomEvent: { customField: string };
    }
}
```

### Получение профиля и аккаунтов по access token (HTTP API)

Токен передаётся в заголовке `Authorization: Bearer …`, не в query string.

```javascript
const profile = await CTraderConnection.getAccessTokenProfile("access-token");
const accounts = await CTraderConnection.getAccessTokenAccounts("access-token");
```

## Параметры соединения

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `host`, `port` | — | Хост и порт Open API |
| `autoReconnect` | `false` | Переподключение при обрыве |
| `maxReconnectAttempts` | `5` | `0` — без лимита |
| `reconnectDelayMs` | `1000` | Начальная задержка, экспоненциальный backoff |
| `maxReconnectDelayMs` | `30000` | Потолок задержки |
| `reconnectJitter` | `true` | Jitter 50–100% от backoff |
| `commandTimeoutMs` | `30000` | `0` — без таймаута |
| `heartbeatIntervalMs` | `25000` | `0` — выключить авто-heartbeat |
| `tlsTimeoutMs` | — | Таймаут TLS-сокета |
| `rateLimitRetry` | `false` | Повтор при `BLOCKED_PAYLOAD_TYPE` |

## События соединения

| Событие | Описание |
|---------|----------|
| `open` | Соединение установлено |
| `close` | Соединение закрыто (в т.ч. после исчерпания reconnect) |
| `error` | Ошибка сокета (эмитится, только если есть слушатель) |
| `reconnecting` | Начата попытка переподключения `{ attempt, maxAttempts, delayMs }` |
| `reconnected` | Переподключение успешно, handlers выполнены |
| `reconnectFailed` | Исчерпаны попытки переподключения |
| `stateChange` | Смена `idle \| connecting \| open \| reconnecting \| closed` |
| `unknownMessage` | Сервер прислал payloadType, которого нет в локальных proto |

## Proto-файлы

Снимок Spotware лежит в `openapi-proto-messages-main`. Обновление (Windows/Linux):

```bash
npm run pull-proto
```

## Разработка

```bash
npm test
npm run build
npm run lint
```

## Contribution

Создайте PR или откройте issue для сообщений об ошибках и предложений.

Беклог: [BACKLOG.md](./BACKLOG.md).
