# Беклог @max89701/ctrader-layer

Версия на момент обзора: **1.5.0**. Форк [Reiryoku ctrader-layer](https://github.com/reiryoku-trader/ctrader-layer): транспортный слой cTrader Open API (TLS + protobuf + команды/события).

Основной потребитель: **moex-arbitrage-bot** (`CtraderService`, `CtraderDepthQuotesService`, `CtraderTfConnectionPoolService`, `CtraderAccountConnection`). Часть логики, которой не хватает в слое, уже продублирована там — это сигнал, что её стоит поднять в библиотеку.

## Статус

**1.5.0 сделано:** P0.1–P0.4, P0.6; P1.7–P1.9, P1.11–P1.15; P1.10 частично (`rateLimitRetry`); P2.16, P2.19–P2.21; P2.22 частично (tls options + timeout); P2.23 (`trySendCommand` глотает только `CTraderCommandError`).

**Дальше:** P0.5 / P2.18 → 2.0; P1.10 очередь лимитов; P2.17 CI; P3.

## Легенда приоритетов

| Приоритет | Критерий |
|-----------|----------|
| **P0** | Ломает продакшен или безопасность: обрывы соединения, утечки, падения декодера |
| **P1** | Надёжность и DX для текущего потребителя: таймауты, типы, heartbeat, лимиты |
| **P2** | Качество пакета: тесты, CI, актуализация toolchain |
| **P3** | Удобство и эволюция: OAuth, ESM, генерация типов из proto |

---

## P0 — критично

### 1. Переподключение не срабатывает на типичных обрывах TLS — **сделано в 1.5.0**

`CTraderSocket` слушает только `end`, не `close`. При `ECONNRESET` / обрыве без FIN Node шлёт `error` + `close`, без `end`.

- `#onError` только эмитит `error` и не планирует reconnect.
- `#onClose` вызывается только с `end`.

**Итог:** `autoReconnect: true` в боте часто бесполезен именно на реальных дисконнектах.

**Сделать:** слушать `close` (один раз, с защитой от реэнтрантности), при ошибке сокета тоже инициировать reconnect, не вызывать `socket.close()` повторно из `#onClose`.

Файлы: `src/core/sockets/CTraderSocket.ts`, `src/core/CTraderConnection.ts`.

### 2. Неизвестный payloadType роняет декодер — **сделано в 1.5.0**

`getMessageByPayloadType` обращается к `#payloadTypes[payloadType].messageBuilded` без проверки. Новое событие с сервера (свежий proto) → исключение в `#onDecodedData` → поток сообщений ломается.

**Сделать:** неизвестные сообщения логировать/эмитить как `unknownMessage` и не падать.

Файл: `src/core/protobuf/CTraderProtobufReader.ts`.

### 3. `sendHeartbeat()` создаёт висящие команды — **сделано в 1.5.0**

Heartbeat уходит через `sendCommand`, то есть попадает в `CTraderCommandMap` и ждёт ответ с `clientMsgId`. Это не request/response: сервер шлёт `ProtoHeartbeatEvent` без привязки к id.

Каждые 25 с (так делают все потребители) карта команд растёт. При закрытии все копящиеся промисы режетятся.

**Сделать:** отправлять heartbeat fire-and-forget, без записи в command map. Встроить авто-heartbeat (интервал 10–25 с, старт на `open`, стоп на `close`).

### 4. Нет таймаута команд — **сделано в 1.5.0**

Если сервер не ответил, промис `sendCommand` висит бесконечно (пока не закроют сокет). Для торговли и истории свечей это зависания запросов.

**Сделать:** `commandTimeoutMs` (дефолт, например 15–30 с), reject с кодом `COMMAND_TIMEOUT`, очистка из map.

### 5. `protobufjs@5.0.1` (2016)

Старый API (`loadProtoFile` / builder), нет поддержки современных Node, известные уязвимости транзитивных зависимостей.

**Сделать:** миграция на `protobufjs@7` (proto2 совместим) или `@bufbuild/protobuf`. Это ломающее изменение — планировать как 2.0.

### 6. Скрипт обновления proto сломан — **сделано в 1.5.0**

`scripts/pull-proto.sh` качает `.../archive/master.zip`, у Spotware ветка уже **`main`**. Распаковка закомментирована, отдельно `unzip.js`, bash+wget — не работает на Windows.

**Сделать:** кроссплатформенный `npm run pull-proto` (Node, ветка `main` или git-тег релиза), фиксировать версию proto в репозитории.

---

## P1 — высокий

### 7. Авто-reconnect слишком хрупкий для бота — **сделано в 1.5.0**

- После `maxReconnectAttempts` (дефолт 5) процесс сдаётся навсегда. Нужен режим `Infinity` / `0 = без лимита`.
- Нет jitter, только экспоненциальный backoff.
- При исчерпании попыток эмитится `reconnectFailed`, но не `close` — потребители не узнают, что соединение мертво.
- Параллельные `error`+`close` могут запустить два таймера reconnect.
- `open()` во время уже открытого сокета создаёт второй TLS без уничтожения первого.

**Сделать:** состояние (`idle | connecting | open | reconnecting | closed`), бесконечный retry с потолком задержки, один in-flight reconnect, событие `close` всегда, когда соединение окончательно потеряно.

### 8. Нет встроенного heartbeat — **сделано в 1.5.0**

Потребители дублируют `setInterval(..., 25000)` в трёх местах. Документация Spotware: соединение рвётся, если нет сообщений > 30 с.

**Сделать:** опция `heartbeatIntervalMs` (дефолт 25000), автозапуск после `open`.

### 9. Класс ошибки вместо «голого» payload — **сделано в 1.5.0**

`sendCommand` реджектит сырым объектом `{ errorCode, description, retryAfter }`. В Nest это не `Error`, нет stack, неудобно логировать.

**Сделать:** `CTraderCommandError extends Error` с полями `errorCode`, `description`, `retryAfter`, `payloadType`, `clientMsgId`. Сохранить совместимость: поля как у текущего payload.

### 10. Rate limit Open API — **частично в 1.5.0** (`rateLimitRetry`)

Лимиты Spotware (актуально на момент обзора): ~50 req/s обычные, ~5 req/s исторические. При превышении — `BLOCKED_PAYLOAD_TYPE` + `retryAfter`.

В боте уже есть `ctrader-rate-limit-gate.ts`. Логично перенести в слой: очередь, пауза по `retryAfter`, опциональный автоповтор.

### 11. Неполный `CTraderEventMap` — **сделано в 1.5.0** (ручные типы; генерация — P3)

В proto есть события, которых нет в типах слоя. Бот уже дополняет карту через module augmentation (`ProtoOADepthEvent`).

Не хватает как минимум:

- `ProtoOADepthEvent` (стакан — используется в проде)
- `ProtoOAAccountDisconnectEvent`
- `ProtoOAMarginCallUpdateEvent` / `ProtoOAMarginCallTriggerEvent`
- `ProtoOAv1PnLChangeEvent`
- `ProtoOAErrorRes` как push (когда нет `clientMsgId`)

У `ProtoOASpotEvent` в типах нет `trendbar[]` (живые бары приходят внутри спота). У `ProtoHeartbeatEvent` в типах есть `timestamp`, в proto его нет.

**Сделать:** типы 1:1 с текущим proto; генерировать из `.proto` (см. P2).

### 12. Типизация `sendCommand` — **частично в 1.5.0** (`sendCommand<TRes>`)

Сейчас `Promise<GenericObject>`. Потребитель везде кастит `as ProtoOATraderRes` и т.д.

**Сделать:** карта `CTraderCommandMapTypes` (req name → res type) по аналогии с `CTraderEventMap`. Минимум — generic `sendCommand<TRes>(...)`.

### 13. `on` типизирован, `off` / `once` / `removeListener` — нет — **сделано в 1.5.0**

Подписка по имени события нормализуется в числовой payloadType. Отписка через `off("ProtoOASpotEvent")` не сработает: слушатель висит на `"2131"`.

**Сделать:** те же overload’и для `off`, `once`, `removeListener`.

### 14. HTTP API: токен в query string — **сделано в 1.5.0** (Bearer; OAuth refresh — P3)

`getAccessTokenProfile` / `getAccessTokenAccounts` передают `access_token` в URL (попадёт в логи прокси/axios). Нет обработки HTTP 401/429, нет refresh.

**Сделать:** заголовок `Authorization`, типы ответа, метод обмена `code → tokens` (сейчас живёт в `ctrader-token.client.ts` бота).

### 15. Состояние соединения — **сделано в 1.5.0**

Нет `isOpen` / `isConnecting`. Потребители ведут флаги снаружи (`_isInitialized`).

**Сделать:** геттеры + событие `stateChange`.

---

## P2 — средний

### 16. Нет тестов — **сделано в 1.5.0**

Нет Jest/`*.spec.ts`. В `tsconfig.json` указан несуществующий `jest.config.js`.

Покрыть в первую очередь:

- фрейминг `CTraderEncoderDecoder` (склейка чанков, несколько сообщений в одном буфере)
- command map: resolve / reject / timeout / rejectAll
- reconnect: `end` vs `error`+`close`, лимит попыток, `#isClosing`
- heartbeat не попадает в command map
- неизвестный payloadType не бросает

### 17. Нет CI — **сделано в 1.5.0** (`.github/workflows/ci.yml`)

Нет `.github/workflows` у самого пакета. Нужны lint, test, build на PR; публикация в npm по тегу.

### 18. Мёртвый toolchain

| Сейчас | Проблема |
|--------|----------|
| TypeScript **4.4** + **ttypescript** | ttypescript заброшен, не работает с TS 5+ |
| `typescript-transform-paths` | ради алиасов `#*` / `!*` |
| target **ES6**, `@types/node` **12** | не соответствует Node 18/20, на которых крутится бот |
| ESLint 7 + `@reiryoku/eslint-config-reiryoku` | устарело |

**Сделать:** TS 5.x, `tsc` без ttypescript, алиасы через `paths` + bundler **или** убрать алиасы (относительные импорты). `engines.node: ">=18"`. ESLint 9 / flat config.

### 19. `removeComments: true` вырезает JSDoc из `.d.ts` — **сделано в 1.5.0**

Публичные методы имеют JSDoc, но в декларации пакета его нет.

**Сделать:** `removeComments: false` (или только strip для js).

### 20. Хрупкий путь к proto — **сделано в 1.5.0**

`path.resolve(__dirname, "../../../openapi-proto-messages-main/...")` завязан на структуру `build/`. Сломается при смене `outDir` или bundling.

**Сделать:** резолв от `package.json` / `import.meta` / явный `protoDir` в параметрах.

### 21. EncoderDecoder: рекурсия по чанкам — **сделано в 1.5.0**

`decode()` вызывает сам себя. Пачка сообщений в одном TCP-буфере может раздуть стек.

**Сделать:** цикл вместо рекурсии.

### 22. Сокет: `@ts-ignore`, нет timeout, нет `secureConnect` — **частично в 1.5.0**

`tls.connect(port, host, cb)` без опций. Нет `socket.setTimeout`, нет проверки `authorized`.

**Сделать:** явные `TlsOptions` (host, timeout, minVersion), слушать `timeout`.

### 23. `trySendCommand` глотает любые ошибки — **сделано в 1.5.0**

В том числе баги библиотеки и таймауты. Минимум — логировать / принимать predicate, какие ошибки глотать.

### 24. Зафиксировать версию proto — **частично в 1.5.0** (`PROTO_VERSION`)

В репозитории лежит snapshot `openapi-proto-messages-main` без номера релиза Spotware (сейчас у них релизы 90+).

**Сделать:** файл `PROTO_VERSION` (git tag/SHA), changelog при обновлении, CI-проверка расхождения с upstream (не автомержить).

---

## P3 — низкий / эволюция

### 25. Высокоуровневый клиент

Слой специально тонкий (`sendCommand` + события). Бот вокруг него нарастил auth, подписки, reconcile, PnL, depth.

Имеет смысл опциональный `CTraderClient` (не ломая `CTraderConnection`):

- `applicationAuth` / `accountAuth`
- `subscribeSpots` / `subscribeDepth` / `subscribeTrendbars` с учётом reconnect
- typed wrappers: `getTrader`, `getReconcile`, `newOrder`, …

Это уже 2.x / отдельный пакет `@max89701/ctrader-client`.

### 26. Генерация TypeScript из proto

Бот генерирует `OpenApiMessages` отдельно. Слой держит ручные интерфейсы, которые расходятся с proto.

**Сделать:** `ts-proto` / `protobuf-ts` в `npm run generate:types`, экспорт enum’ов (`ProtoOAPayloadType`, `ProtoOAExecutionType`, …).

### 27. Dual package CJS + ESM

Сейчас только CommonJS. Для новых Nest/Vite-потребителей — `"exports"` с `require`/`import`.

### 28. uuid v1

`uuid@8` + v1 (MAC/время). Достаточно `crypto.randomUUID()` (Node 16+).

### 29. Документация — **частично в 1.5.0**

README есть, но нет:

- ограничений Open API (лимиты, demo/live хосты, 30 с heartbeat)
- таблицы payloadType
- миграции 1.x → 2.x
- примера с autoReconnect + heartbeat + auth (сейчас heartbeat и reconnect разнесены)

`CHANGELOG` у всех 1.4.x стоит дата `03-02-2025` — поправить при следующих релизах.

### 30. `safe-build` только для cmd.exe — **сделано в 1.5.0**

`if exist "build" rmdir` непереносим. Заменить на `rimraf` / `node -e fs.rmSync`.

### 31. Публичный API сокета и encoder’а

Сейчас наружу только `CTraderConnection` + типы. Это правильно. Не экспортировать внутренности без нужды; если экспортировать — стабильный контракт и тесты.

---

## Что уже сделано (не повторять)

Закрыто в 1.4.x относительно апстрима Reiryoku:

- autoReconnect, reconnect handlers, события `open/close/error/reconnecting/reconnected/reconnectFailed`
- `close()`, `rejectAll` для висящих команд
- JSDoc, README на русском
- axios 1.x, `response.data` для HTTP-хелперов
- `CTraderEventMap` и overload `on()`
- ужесточение типов, отказ от части `any`

Это база. Дальше — надёжность соединения и типы, а не новые «фичи ради фич».

---

## Предлагаемый порядок релизов

### 1.5.0 (патч надёжности) — **выпущен**

Сделано. Совместимо с ботом: можно убрать ручные `setInterval(heartbeat)`. `sendCommand` теперь реджектит `CTraderCommandError` (поля `errorCode`/`description` сохранены).

### 1.6.0 (лимиты)

Полноценная очередь rate limit (P1.10) вместо одного retry. Карта req→res для `sendCommand`. CI.

### 2.0.0 (ломающие)

P0.5 (protobufjs 7), P2.18 (TS 5, без ttypescript), P3.26–P3.28.

Миграция: сменить импорты, проверить сборку `moex-arbitrage-bot`, прогнать стаканы/свечи/ордера на demo.

---

## Вне скоупа слоя

Не тащить в библиотеку (оставить в боте):

- агрегация стакана и троттлинг эмита (`CtraderDepthQuotesService`);
- пул TF-соединений;
- Nest DI / менеджер аккаунтов;
- Telegram-уведомления об auth;
- бизнес-стратегии и риск.

Слой должен остаться транспортом: соединение, фрейминг, protobuf, команды, события, reconnect, heartbeat, ошибки, лимиты.
