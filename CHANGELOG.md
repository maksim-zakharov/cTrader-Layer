1.4.0 - 03-02-2025
===================
* Добавлен JSDoc ко всем публичным методам и классам.
* Расширен README: примеры обработки ошибок, типы, события, переподключение.
* Добавлены типы событий: CTraderEventPayload, CTraderEventListener, CTraderReconnectHandler.
* Реализовано автоматическое переподключение при разрыве соединения (autoReconnect, maxReconnectAttempts, reconnectDelayMs).
* Добавлены обработчики переподключения addReconnectHandler/removeReconnectHandler для повторной аутентификации и подписок.
* Добавлены события: open, close, error, reconnecting, reconnected, reconnectFailed.
* Добавлено закрытие соединения: метод close().
* Добавлены startHeartbeat/stopHeartbeat для автоматической отправки heartbeat.
* Исправлена работа getAccessTokenProfile и getAccessTokenAccounts (использование response.data вместо JSON.parse).
* Исправлен tls.connect: убран @ts-ignore, корректная передача колбэков.
* Добавлен метод rejectAll в CTraderCommandMap для отклонения ожидающих команд при закрытии.

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
