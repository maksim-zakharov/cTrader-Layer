import { computeReconnectDelayMs, normalizeConnectionParameters } from "#CTraderConnectionParameters";

describe("computeReconnectDelayMs", () => {
    it("считает экспоненциальный backoff без jitter", () => {
        expect(computeReconnectDelayMs(1, 1000, 30_000, false)).toBe(1000);
        expect(computeReconnectDelayMs(2, 1000, 30_000, false)).toBe(2000);
        expect(computeReconnectDelayMs(3, 1000, 30_000, false)).toBe(4000);
    });

    it("ограничивает задержку потолком", () => {
        expect(computeReconnectDelayMs(10, 1000, 5000, false)).toBe(5000);
    });

    it("с jitter возвращает значение в диапазоне 50–100% от backoff", () => {
        const random = jest.spyOn(Math, "random");

        random.mockReturnValue(0);
        expect(computeReconnectDelayMs(1, 1000, 30_000, true)).toBe(500);

        random.mockReturnValue(1);
        expect(computeReconnectDelayMs(1, 1000, 30_000, true)).toBe(1000);
    });
});

describe("normalizeConnectionParameters", () => {
    it("подставляет значения по умолчанию", () => {
        const normalized = normalizeConnectionParameters({
            host: "demo.ctraderapi.com",
            port: 5035,
        });

        expect(normalized.autoReconnect).toBe(false);
        expect(normalized.maxReconnectAttempts).toBe(5);
        expect(normalized.heartbeatIntervalMs).toBe(25_000);
        expect(normalized.commandTimeoutMs).toBe(30_000);
        expect(normalized.reconnectJitter).toBe(true);
        expect(normalized.rateLimitRetry).toBe(false);
    });
});
