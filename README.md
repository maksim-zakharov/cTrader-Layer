# cTrader Layer

Node.js транспорт для [cTrader Open API](https://help.ctrader.com/open-api/): TLS + protobuf + команды/события, reconnect, heartbeat.

Пакет: `@max89701/ctrader-layer` · форк [Reiryoku ctrader-layer](https://github.com/reiryoku-trader/ctrader-layer).

Это **тонкий транспорт**, не торговый SDK. Аккаунты, пулы соединений, агрегация стакана — у потребителя.

## Установка

```bash
npm install @max89701/ctrader-layer
```

Требуется **Node.js 18+**. С 2.0: `protobufjs@7`, TypeScript 5 toolchain (публичный API соединения без изменений).

Пакет **dual**: CommonJS и ESM через `exports` (разные файлы `.js` / `.mjs` — без dual-package hazard).

```js
// CommonJS (Nest и т.п.)
const { CTraderConnection } = require("@max89701/ctrader-layer");

// ESM
import { CTraderConnection } from "@max89701/ctrader-layer";
```

Точка входа: `build/main.js` (require) и `build/main.mjs` (import). Типы: `build/main.d.ts`. Не импортируйте глубокие пути вида `.../build/entry/...` — только корень пакета.

## Хосты и порты

Demo и live **разделены**: на одном соединении нельзя смешивать demo- и live-счета. Нужны оба — два соединения.

| Среда | Protobuf (этот пакет) | JSON (не используется слоем) |
|-------|------------------------|------------------------------|
| Demo | `demo.ctraderapi.com:5035` | `demo.ctraderapi.com:5036` |
| Live | `live.ctraderapi.com:5035` | `live.ctraderapi.com:5036` |

Источник: [Proxies and endpoints](https://help.ctrader.com/open-api/proxies-endpoints/).

## Ограничения Spotware

Актуальные лимиты — на [Getting started](https://help.ctrader.com/open-api/) и в [FAQ](https://help.ctrader.com/open-api/faq/). Кратко:

| Ограничение | Значение | Как учитывать в слое |
|-------------|----------|----------------------|
| Обычные запросы | ≤ **50** req/s на соединение | Не спамить `sendCommand`; при превышении — `BLOCKED_PAYLOAD_TYPE` + `retryAfter` |
| Исторические запросы | ≤ **5** req/s на соединение | Trendbars / deal list / cashflow и т.п. — реже |
| Heartbeat | не реже чем раз в **10 с** | Авто: `heartbeatIntervalMs` (по умолчанию **25000**). Для простоя без трафика лучше `10000` |
| Тишина | сервер рвёт idle-сессию | Heartbeat или любой outbound-трафик |

При `BLOCKED_PAYLOAD_TYPE` включите один повтор: `rateLimitRetry: true` (ждёт `retryAfter`). Полноценная очередь лимитов — в планах 1.6 (см. Linear).

Таймаут ожидания ответа команды: `commandTimeoutMs` (по умолчанию **30000**, `0` — без таймаута).

## Быстрый старт: open → auth → heartbeat → reconnect

Один сценарий, достаточный для нового потребителя. Heartbeat идёт сам после `open`; после обрыва TLS вызывается reconnect handler (повторный auth + подписки).

```javascript
const { CTraderConnection, CTraderCommandError } = require("@max89701/ctrader-layer");

const connection = new CTraderConnection({
    host: "demo.ctraderapi.com", // live: live.ctraderapi.com
    port: 5035,
    autoReconnect: true,
    maxReconnectAttempts: 0, // без лимита
    heartbeatIntervalMs: 10000, // рекомендация Spotware; дефолт слоя — 25000
    commandTimeoutMs: 30000,
    rateLimitRetry: true,
});

async function authorizeAndSubscribe(conn) {
    await conn.sendCommand("ProtoOAApplicationAuthReq", {
        clientId: process.env.CTRADER_CLIENT_ID,
        clientSecret: process.env.CTRADER_CLIENT_SECRET,
    });
    await conn.sendCommand("ProtoOAAccountAuthReq", {
        ctidTraderAccountId: Number(process.env.CTRADER_ACCOUNT_ID),
        accessToken: process.env.CTRADER_ACCESS_TOKEN,
    });
    await conn.sendCommand("ProtoOASubscribeSpotsReq", {
        ctidTraderAccountId: Number(process.env.CTRADER_ACCOUNT_ID),
        symbolId: [1],
    });
}

connection.addReconnectHandler(authorizeAndSubscribe);

connection.on("ProtoOASpotEvent", (payload) => {
    console.log("spot", payload.symbolId, payload.bid, payload.ask);
});

connection.on("stateChange", (state) => {
    console.log("state", state);
});

connection.on("reconnected", () => {
    console.log("переподключено, auth/subscribe уже в handler");
});

connection.on("reconnectFailed", (err) => {
    console.error("reconnect failed", err);
});

connection.on("close", () => {
    console.log("соединение закрыто");
});

await connection.open();
await authorizeAndSubscribe(connection);

// Ручной heartbeat не нужен при heartbeatIntervalMs > 0.
// connection.sendHeartbeat();

// ...
// connection.close();
```

Ключевые опции: `autoReconnect`, `heartbeatIntervalMs`, `commandTimeoutMs`, `rateLimitRetry` (см. таблицу ниже).

## Использование

Официальная документация API: [Open API](https://help.ctrader.com/open-api/).

### Отправка команд

`sendCommand` ждёт ответ (или таймаут / ошибку). В TypeScript для имён из `CTraderCommandMapTypes` тип ответа выводится автоматически.

```javascript
const response = await connection.sendCommand("ProtoOAVersionReq", {});
console.log(response.version);
```

```ts
declare module "@max89701/ctrader-layer" {
    interface CTraderCommandMapTypes {
        MyCustomReq: CTraderCommandDescriptor<{ id?: number }, { ok?: boolean }>;
    }
}
```

Неизвестные имена и числовой `payloadType` → `GenericObject` / `sendCommand<MyRes>(...)`.

### Ошибки

```javascript
try {
    await connection.sendCommand("ProtoOANewOrderReq", { /* ... */ });
} catch (error) {
    if (error instanceof CTraderCommandError) {
        console.error(error.errorCode, error.description, error.retryAfter);
    }
}

const result = await connection.trySendCommand("ProtoOANewOrderReq", {});
// undefined только при CTraderCommandError; прочие исключения пробрасываются
```

### Heartbeat

- Авто: `heartbeatIntervalMs` (по умолчанию `25000`, `0` — выкл.).
- Ручной `sendHeartbeat()` **не** попадает в карту команд (fire-and-forget).

### Переподключение

При обрыве TLS (`close` / `ECONNRESET`) при `autoReconnect: true` слой переподключается с backoff + jitter. В `addReconnectHandler` — повторный application/account auth и подписки.

После исчерпания попыток: `reconnectFailed` и `close`. `maxReconnectAttempts: 0` — без лимита.

### События рынка и lifecycle

```typescript
connection.on("ProtoOASpotEvent", (payload) => { /* bid/ask */ });
connection.on("ProtoOADepthEvent", (payload) => { /* стакан */ });
connection.on("unknownMessage", ({ payloadType }) => { /* новый proto */ });

connection.off("ProtoOASpotEvent", onSpot); // имя нормализуется так же, как в on
```

События lifecycle (`open`, `close`, `error`, `reconnecting`, `reconnected`, `reconnectFailed`, `stateChange`) не резолвятся как proto-имена.

### HTTP: профиль и счета

Токен только в `Authorization: Bearer …` (не в query).

```javascript
const profile = await CTraderConnection.getAccessTokenProfile("access-token");
const accounts = await CTraderConnection.getAccessTokenAccounts("access-token");
```

## Параметры соединения

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `host`, `port` | — | См. [хосты](#хосты-и-порты) |
| `autoReconnect` | `false` | Переподключение при обрыве |
| `maxReconnectAttempts` | `5` | `0` — без лимита |
| `reconnectDelayMs` | `1000` | Начальная задержка, экспоненциальный backoff |
| `maxReconnectDelayMs` | `30000` | Потолок задержки |
| `reconnectJitter` | `true` | Jitter 50–100% от backoff |
| `commandTimeoutMs` | `30000` | `0` — без таймаута ответа |
| `heartbeatIntervalMs` | `25000` | `0` — выкл.; для idle лучше `10000` |
| `tlsTimeoutMs` | — | Таймаут TLS-сокета |
| `rateLimitRetry` | `false` | Один повтор при `BLOCKED_PAYLOAD_TYPE` |
| `protoDir` | bundled | Каталог proto Spotware |

## События соединения

| Событие | Описание |
|---------|----------|
| `open` | Соединение установлено |
| `close` | Закрыто (в т.ч. после исчерпания reconnect) |
| `error` | Ошибка сокета (только если есть слушатель) |
| `reconnecting` | Попытка reconnect `{ attempt, maxAttempts, delayMs }` |
| `reconnected` | Успех, handlers выполнены |
| `reconnectFailed` | Исчерпаны попытки |
| `stateChange` | `idle \| connecting \| open \| reconnecting \| closed` |
| `unknownMessage` | Неизвестный `payloadType` в локальных proto |

## Proto-файлы

Снимок Spotware: `openapi-proto-messages-main`. Версия зафиксирована в `PROTO_VERSION`.

```bash
npm run pull-proto
```

## Миграция 1.x → 2.0

**Сделано в 2.0.0:** `protobufjs@5` → `protobufjs@7`. Внутренний reader на `Root.loadSync` / `Type`; адаптер сообщений (`encode` / `decode` / `toBuffer`) и публичный API `CTraderConnection` без изменений.

| Тема | 1.x | 2.0 |
|------|-----|-----|
| Protobuf | `protobufjs@5` | **`protobufjs@7`** (сделано) |
| Toolchain | TS 4.4 + ttypescript | **TS 5 + tsc typecheck / tsup build** (сделано) |
| Node | `>=14.17` | **`>=18`** (сделано) |
| `clientMsgId` | `uuid` v1 | **`crypto.randomUUID()`** (сделано) |
| Модули | dual CJS + ESM с 1.6 | без изменений в 2.0 |
| Типы | ручные карты | генерация из `.proto` (план) |

Что **не** ломается по смыслу: `open` / `sendCommand` / события / reconnect handlers / `CTraderCommandError` (`errorCode` / `description` / `retryAfter`).

Перед апгрейдом: `@max89701/ctrader-layer@^2` → `npm test` у потребителя → smoke auth + spots/depth на demo.

## Разработка

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

Беклог: [BACKLOG.md](./BACKLOG.md) · задачи: [ctrader-layer в Linear](https://linear.app/maksim-zakharov/project/ctrader-layer-898108486d89).

## Contribution

PR или issue — ошибки и предложения приветствуются.
