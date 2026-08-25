# cTrader-Layer — контекст для LLM

Документ описывает пакет **@max89701/ctrader-layer** для передачи контекста при доработке.

Подробный список работ: [BACKLOG.md](./BACKLOG.md). Текущая версия: **1.5.0**.

---

## 1. Назначение

Node.js-слой для [cTrader Open API](https://help.ctrader.com/open-api/): TLS-сокет, protobuf-фрейминг, отправка команд с ожиданием ответа, push-события, auto-reconnect, heartbeat.

Это **транспорт**, не торговый SDK. Высокоуровневая логика (аккаунты, подписки, стаканы, PnL) живёт в потребителе — `moex-arbitrage-bot`.

Форк [reiryoku-trader/ctrader-layer](https://github.com/reiryoku-trader/ctrader-layer). Публикация: npm `@max89701/ctrader-layer`.

**Стек:** TypeScript 4.4, ttypescript (path aliases), protobufjs 5.0.1, axios, uuid. Сборка: `npm run build` (`ttsc`). Тесты: `npm test` (Jest). Lint: `npm run lint`.

---

## 2. Структура

```
cTrader-Layer/
├── entry/node/main.ts          # публичный экспорт
├── src/core/
│   ├── CTraderConnection.ts    # ядро
│   ├── CTraderCommandError.ts
│   ├── sockets/                # TLS, событие close
│   ├── encoder-decoder/        # 4 байта длины + payload
│   ├── protobuf/
│   ├── commands/               # карта clientMsgId + timeout
│   ├── types/
│   └── *.spec.ts               # Jest
├── openapi-proto-messages-main/
├── scripts/pull-proto.js
├── BACKLOG.md
└── AGENTS.md
```

Публичный API: `CTraderConnection`, `CTraderCommandError`, параметры, типы.

---

## 3. Контракт 1.5.0

```ts
const connection = new CTraderConnection({
  host: "live.ctraderapi.com",
  port: 5035,
  autoReconnect: true,
  maxReconnectAttempts: 0, // без лимита
  heartbeatIntervalMs: 25000, // 0 = выкл.
  commandTimeoutMs: 30000,
});

await connection.open();
await connection.sendCommand("ProtoOAApplicationAuthReq", { clientId, clientSecret });
// heartbeat сам; sendHeartbeat() не создаёт висящую команду

connection.on("ProtoOASpotEvent", (payload) => { /* типизировано */ });
connection.on("unknownMessage", ({ payloadType }) => { /* новый proto */ });
connection.addReconnectHandler(async (conn) => { /* auth + resubscribe */ });
connection.close();
```

`sendCommand` реджектит `CTraderCommandError` (`errorCode`, `description`, `retryAfter`). `trySendCommand` глотает только этот класс.

HTTP: Bearer-заголовок, не query string.

Второй аргумент конструктора `{ socket, protobufReader }` — шов для тестов.

---

## 4. Потребитель

`moex-arbitrage-bot`: общий клиент, depth, пул TF, per-account. После 1.5.0 можно убрать ручные `setInterval(heartbeat)` и module augmentation для `ProtoOADepthEvent`. Rate-limit gate бота пока оставить (в слое только опциональный один retry).

---

## 5. Конвенции доработок

- Слой остаётся тонким: не тащить Nest, RxJS, бизнес-логику ордеров.
- Логи и JSDoc — на русском.
- Не ломать 1.x без нужды: `CTraderCommandError` сохраняет `errorCode` / `description`.
- Ломающие изменения (protobufjs 7, TS 5) — только major 2.0.
- Новые фичи — со unit-тестами (`npm test`). Имена тестов на русском.
- После правок — `npm test` и `npm run build`.
