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

Отправляйте heartbeat каждые 25 секунд или используйте встроенный интервал:

```javascript
// Вручную
setInterval(() => connection.sendHeartbeat(), 25000);

// Или встроенный интервал
connection.startHeartbeat(25000);
```

### Подписка на события

События можно подписывать по имени сообщения или по числовому `payloadType`:

```javascript
// По имени события
connection.on("ProtoOAExecutionEvent", (payload) => {
    console.log("Исполнение:", payload);
});

connection.on("ProtoOASpotEvent", (payload) => {
    console.log("Спот:", payload);
});

// По числовому payload type (например, 2126 для ProtoOAExecutionEvent)
connection.on("2126", (payload) => {
    console.log(payload);
});
```

### Переподключение и переподписки

При разрыве соединения можно включить автоматическое переподключение с повторной аутентификацией и подписками:

```javascript
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

## Типы (TypeScript)

```typescript
import {
    CTraderConnection,
    CTraderConnectionParameters,
    CTraderEventPayload,
    CTraderEventListener,
    CTraderReconnectHandler,
} from "@max89701/ctrader-layer";
```

## Требования

- Node.js 12+
- TypeScript 4.4+ (при использовании типов)

## Contribution

Создайте PR или откройте issue для сообщений об ошибках и предложений.
