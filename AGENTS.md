# cTrader-Layer — контекст для LLM

Документ описывает пакет **@max89701/ctrader-layer** для передачи контекста при доработке.

Подробный список работ: [BACKLOG.md](./BACKLOG.md). Текущая версия: **1.6.0**.

---

## 0. Linear

| Поле | Значение |
|------|----------|
| Project | [ctrader-layer](https://linear.app/maksim-zakharov/project/ctrader-layer-898108486d89) (`P-MAK-5`) |
| Team | Maksim Zakharov (`MAK`) |
| Repo | https://github.com/maksim-zakharov/cTrader-Layer |
| Потребитель | [ctrader-server](https://linear.app/maksim-zakharov/project/ctrader-server-92f6adc944fb) (`P-MAK-3`) |
| Машиночитаемо | `.linear.json` в корне |

Задачи пакета — только в `ctrader-layer`. Правки бота под новую версию слоя — в `ctrader-server`.

Эпик рефакторинга после 1.5.0: [MAK-86](https://linear.app/maksim-zakharov/issue/MAK-86/epic-refaktoring-max89701ctrader-layer-posle-150).

---

## 1. Назначение

Node.js-слой для [cTrader Open API](https://help.ctrader.com/open-api/): TLS-сокет, protobuf-фрейминг, отправка команд с ожиданием ответа, push-события, auto-reconnect, heartbeat.

Это **транспорт**, не торговый SDK. Высокоуровневая логика (аккаунты, подписки, стаканы, PnL) живёт в потребителе — `moex-arbitrage-bot`.

Форк [reiryoku-trader/ctrader-layer](https://github.com/reiryoku-trader/ctrader-layer). Публикация: npm `@max89701/ctrader-layer`.

**Стек:** TypeScript 4.4, protobufjs 5.0.1, axios, uuid. Сборка: `npm run build` (**tsup** → CJS `build/main.js` + ESM `build/main.mjs`). Легаси `npm run build:ttsc` (ttypescript) оставлен для отладки. Тесты: `npm test` (Jest). Проверка exports: `npm run verify:exports`. Lint: `npm run lint`.

---

## 2. Структура

```
cTrader-Layer/
├── entry/node/main.ts          # entry для tsup
├── tsup.config.js              # dual CJS+ESM
├── src/core/
│   ├── CTraderConnection.ts    # ядро
│   ├── CTraderCommandError.ts
│   ├── sockets/                # TLS, событие close
│   ├── encoder-decoder/        # 4 байта длины + payload
│   ├── protobuf/
│   ├── commands/               # карта clientMsgId + timeout
│   ├── types/
│   └── *.spec.ts               # Jest
├── build/main.js | main.mjs    # артефакты публикации
├── openapi-proto-messages-main/
├── scripts/pull-proto.js
├── scripts/verify-dual-exports.*
├── BACKLOG.md
└── AGENTS.md
```

Публичный API: `CTraderConnection`, `CTraderCommandError`, параметры, типы. Импорт только с корня пакета (`exports["."]`).

---

## 3. Контракт 1.6.0

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
const trader = await connection.sendCommand("ProtoOATraderReq", { ctidTraderAccountId });
// trader: ProtoOATraderResPayload (без as)
// heartbeat сам; sendHeartbeat() не создаёт висящую команду

connection.on("ProtoOASpotEvent", (payload) => { /* типизировано */ });
connection.on("unknownMessage", ({ payloadType }) => { /* новый proto */ });
connection.addReconnectHandler(async (conn) => { /* auth + resubscribe */ });
connection.close();
```

`sendCommand` реджектит `CTraderCommandError` (`errorCode`, `description`, `retryAfter`). `trySendCommand` глотает только этот класс.
Имена из `CTraderCommandMapTypes` типизируют request/response; числовой payloadType и неизвестные имена — `GenericObject` / `sendCommand<TRes>(...)`.

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
