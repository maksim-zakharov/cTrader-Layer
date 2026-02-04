# cTrader Layer

Node.js слой для работы с [cTrader Open API](https://connect.spotware.com).<br>
Реализация создана и поддерживается Reiryoku Technologies и контрибьюторами.

## Установка

```bash
npm install @max89701/ctrader-layer
```

## Использование

Подробная документация по cTrader Open API: [Open API Documentation](https://spotware.github.io/open-api-docs/).

### Подключение к серверу

```javascript
const { CTraderConnection } = require("@max89701/ctrader-layer");

const connection = new CTraderConnection({
    host: "demo.ctraderapi.com",
    port: 5035,
});

await connection.open();
```

### Отправка команд

Метод `sendCommand` отправляет команду и возвращает `Promise`, который разрешается при получении ответа от сервера. При ошибке (наличие `errorCode` в ответе) `Promise` отклоняется.

```javascript
const response = await connection.sendCommand("ProtoOAVersionReq", {});
console.log(response.version);
```

### Обработка ошибок

```javascript
try {
    await connection.sendCommand("ProtoOANewOrderReq", { /* ... */ });
} catch (error) {
    // error содержит payload с errorCode и description
    console.error("Ошибка:", error.errorCode, error.description);
}

// Без выброса исключения:
const result = await connection.trySendCommand("ProtoOANewOrderReq", {});
if (result === undefined) {
    console.log("Команда не выполнена");
}
```

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

### Поддержание соединения (heartbeat)

Отправляйте heartbeat каждые 25 секунд:

```javascript
setInterval(() => connection.sendHeartbeat(), 25000);
```

### Переподключение и переподписки

При разрыве соединения можно включить автоматическое переподключение с повторной аутентификацией и подписками:

```javascript
const { CTraderConnection } = require("@max89701/ctrader-layer");

const connection = new CTraderConnection({
    host: "demo.ctraderapi.com",
    port: 5035,
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelayMs: 1000,
});

// Обработчик для повторной аутентификации и подписок после переподключения
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

### Закрытие соединения

```javascript
connection.close();
```

### Подписка на события

События можно подписывать по имени сообщения или по числовому `payloadType`.
Тип payload выводится автоматически по имени события из маппинга `CTraderEventMap`:

```typescript
import { CTraderConnection } from "@max89701/ctrader-layer";

// Тип payload выводится автоматически — ProtoOASpotEventPayload
connection.on("ProtoOASpotEvent", (payload) => {
    // payload.ctidTraderAccountId, payload.symbolId, payload.bid, payload.ask — типизированы
    console.log("Спот:", payload.bid, payload.ask);
});

connection.on("ProtoOAExecutionEvent", (payload) => {
    // payload.executionType, payload.errorCode и т.д.
    console.log("Исполнение:", payload.executionType);
});

// По числовому payload type — payload: CTraderPayload
connection.on("2131", (payload) => {
    console.log("Спот:", payload);
});
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

```javascript
const profile = await CTraderConnection.getAccessTokenProfile("access-token");
const accounts = await CTraderConnection.getAccessTokenAccounts("access-token");
```

## События соединения

| Событие | Описание |
|---------|----------|
| `open` | Соединение установлено |
| `close` | Соединение закрыто |
| `error` | Ошибка (передаётся объект Error) |
| `reconnecting` | Начата попытка переподключения |
| `reconnected` | Переподключение успешно |
| `reconnectFailed` | Исчерпаны попытки переподключения |

## Требования

- Node.js 12+

## Contribution

Создайте PR или откройте issue для сообщений об ошибках и предложений.
