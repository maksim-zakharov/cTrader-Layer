1.5.1 - 26-08-2026
===================
* Улучшены Jest-тесты `CTraderConnection` / команд (стабильнее флейки, общие test-utils).
* Мелкие правки конфигурации Jest.

1.5.0 - 25-08-2026
===================
* Переподключение слушает TLS-событие `close` (а не только `end`) — работает на ECONNRESET.
* Heartbeat больше не создаёт висящие команды; авто-heartbeat каждые 25 с (`heartbeatIntervalMs`, 0 — выкл.).
* Таймаут команд (`commandTimeoutMs`, по умолчанию 30 с), код `COMMAND_TIMEOUT`.
* Неизвестный payloadType не роняет декодер: событие `unknownMessage`.
* `CTraderCommandError` вместо «голого» payload при reject.
* Состояние соединения: `state`, `isOpen`, `isConnecting`, событие `stateChange`.
* `off` / `once` / `removeListener` нормализуют имя события так же, как `on`.
* События жизненного цикла (`open`, `close`, `error`, …) больше не резолвятся как proto-имена.
* Безлимитный reconnect: `maxReconnectAttempts: 0`; после исчерпания попыток эмитится `close`.
* Jitter и потолок задержки reconnect (`reconnectJitter`, `maxReconnectDelayMs`).
* HTTP-хелперы передают токен в `Authorization`, не в query.
* Опциональный повтор при `BLOCKED_PAYLOAD_TYPE` (`rateLimitRetry`).
* `CTraderEventMap`: Depth, AccountDisconnect, MarginCall, PnLChange, ErrorRes.
* Кроссплатформенный `npm run pull-proto`; `safe-build` через Node.
* EncoderDecoder декодирует пачку кадров циклом, без рекурсии.
* Jest-тесты на фрейминг, команды, protobuf, сокет, reconnect, heartbeat, HTTP.

1.4.6 - 03-02-2025
===================
* Добавлен CTraderEventMap — маппинг имён событий на типы payload.
* Тип payload в on() выводится автоматически по имени события (без generic-параметра).
* Добавлены интерфейсы payload для событий: ProtoOASpotEvent, ProtoOAExecutionEvent и др.
* Поддержка module augmentation для расширения CTraderEventMap.

1.4.5 - 03-02-2025
===================
* Метод on() теперь поддерживает generic-параметр для типизации payload.
* Пример: connection.on&lt;ProtoOASpotEvent&gt;("ProtoOASpotEvent", (payload) => ...) — payload типизирован без приведения типов.

1.4.4 - 03-02-2025
===================
* Добавлены типы: CTraderPayload, CTraderDecodedMessage, CTraderEncodable, CTraderEventListener.
* GenericObject заменён на Record<string, unknown>.
* Убраны все использования any, добавлены строгие типы.
* Добавлены интерфейсы для protobuf (ProtoFileOption, ProtobufBuilder, ProtobufReflect и др.).
* Экспорт типов из пакета (src/core/types).

1.4.3 - 03-02-2025
===================
* Обновлён axios с 0.21.1 до ^1.6.0 (исправление уязвимостей).
* Исправлена работа getAccessTokenProfile и getAccessTokenAccounts: использование response.data вместо JSON.parse.

1.4.2 - 03-02-2025
===================
* Реализовано автоматическое переподключение при разрыве соединения (autoReconnect, maxReconnectAttempts, reconnectDelayMs).
* Добавлены обработчики переподключения addReconnectHandler/removeReconnectHandler для повторной аутентификации и подписок.
* Добавлены события: open, close, error, reconnecting, reconnected, reconnectFailed.
* Добавлен метод close() для закрытия соединения.
* Добавлен метод rejectAll в CTraderCommandMap для отклонения ожидающих команд при закрытии.
* Добавлен метод close() в CTraderSocket.
* Исправлена передача колбэков в tls.connect (стрелочные функции для сохранения контекста).

1.4.1 - 03-02-2025
===================
* Добавлен JSDoc ко всем публичным методам и классам.
* Расширен README: примеры обработки ошибок, подписки по имени и payload type.

1.3.0 - 06-07-2021
===================
* Create internal decoding of payload type.

1.2.2 - 01-07-2021
===================
* Handle "errorCode" defined with null value.

1.2.1 - 30-06-2021
===================
* Include protobuf files in published package.

1.2.0 - 19-06-2021
===================
* Create "getAccessTokenProfile" utility method.
* Create "getAccessTokenAccounts" utility method.

1.1.0 - 16-06-2021
===================
* Use TypeScript and refactor codebase.
* Refactor codebase and use private fields.
* Improve documentation.

1.0.0 - 05-06-2021
===================
