# cTrader-Layer — контекст для LLM

Документ описывает пакет **@max89701/ctrader-layer** для передачи контекста при доработке.

Подробный список работ: [BACKLOG.md](./BACKLOG.md).

---

## 1. Назначение

Node.js-слой для [cTrader Open API](https://help.ctrader.com/open-api/): TLS-сокет, protobuf-фрейминг, отправка команд с ожиданием ответа, push-события, опциональный auto-reconnect.

Это **транспорт**, не торговый SDK. Высокоуровневая логика (аккаунты, подписки, стаканы, PnL) живёт в потребителе — `moex-arbitrage-bot`.

Форк [reiryoku-trader/ctrader-layer](https://github.com/reiryoku-trader/ctrader-layer). Публикация: npm `@max89701/ctrader-layer` (сейчас 1.4.6).

**Стек:** TypeScript 4.4, ttypescript (path aliases), protobufjs 5.0.1, axios, uuid. Сборка: `npm run build` (`ttsc`). Lint: `npm run lint`.

---

## 2. Структура

```
cTrader-Layer/
├── entry/node/main.ts          # публичный экспорт
├── src/core/
│   ├── CTraderConnection.ts    # ядро: команды, события, reconnect
│   ├── CTraderConnectionParameters.ts
│   ├── sockets/                # TLS
│   ├── encoder-decoder/        # 4 байта длины + payload
│   ├── protobuf/               # загрузка .proto, encode/decode
│   ├── commands/               # карта ожидающих clientMsgId
│   ├── types/                  # CTraderEventMap, payload-интерфейсы
│   └── utilities/
├── openapi-proto-messages-main/  # snapshot proto Spotware
├── scripts/                    # pull-proto.sh, unzip.js
├── BACKLOG.md
└── AGENTS.md
```

Публичный API: `CTraderConnection`, параметры соединения, типы из `src/core/types`.

---

## 3. Как пользоваться (контракт)

```ts
const connection = new CTraderConnection({
  host: "live.ctraderapi.com", // или demo.ctraderapi.com
  port: 5035,
  autoReconnect: true,
});

await connection.open();
await connection.sendCommand("ProtoOAApplicationAuthReq", { clientId, clientSecret });
connection.sendHeartbeat(); // потребители вызывают каждые 25 с

connection.on("ProtoOASpotEvent", (payload) => { /* типизировано */ });
connection.addReconnectHandler(async (conn) => { /* auth + resubscribe */ });
connection.close();
```

`sendCommand` реджектит, если в ответе есть `errorCode`. `trySendCommand` глотает ошибку и возвращает `undefined`.

HTTP: `CTraderConnection.getAccessTokenProfile` / `getAccessTokenAccounts`.

---

## 4. Потребитель

`moex-arbitrage-bot` создаёт несколько соединений:

- общий `CTraderConnection` в `app.module.ts`;
- depth — `ctrader-depth-quotes.service.ts`;
- пул TF — `ctrader-tf-connection-pool.service.ts`;
- per-account — `ctrader-account-connection.ts`.

Там же обходные пути, которые желательно убрать после доработки слоя: ручной heartbeat, rate-limit gate, module augmentation для `ProtoOADepthEvent`, касты ответов команд.

---

## 5. Конвенции доработок

- Слой остаётся тонким: не тащить Nest, RxJS, бизнес-логику ордеров.
- Логи и JSDoc — на русском (как в текущем коде).
- Не ломать 1.x без нужды: класс ошибки должен сохранять поля `errorCode` / `description`.
- Ломающие изменения (protobufjs 7, TS 5, смена алиасов) — только major 2.0.
- После правок транспорта — прогнать в боте стаканы, споты, историю свечей и auth на demo.
- Тестов в пакете пока нет; новые фичи сопровождать unit-тестами (encoder, command map, reconnect).
