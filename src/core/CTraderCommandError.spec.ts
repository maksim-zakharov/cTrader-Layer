import { CTraderCommandError } from "#CTraderCommandError";

describe("CTraderCommandError", () => {
    it("собирает message из errorCode и description", () => {
        const error = new CTraderCommandError({
            errorCode: "CH_NOT_FOUND",
            description: "символ не найден",
        });

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("CTraderCommandError");
        expect(error.errorCode).toBe("CH_NOT_FOUND");
        expect(error.description).toBe("символ не найден");
        expect(error.message).toBe("CTraderError CH_NOT_FOUND: символ не найден");
    });

    it("читает retryAfter и extras", () => {
        const error = new CTraderCommandError({
            errorCode: "BLOCKED_PAYLOAD_TYPE",
            retryAfter: 12.2,
        }, { clientMsgId: "abc", payloadType: 2100, });

        expect(error.retryAfter).toBe(13);
        expect(error.clientMsgId).toBe("abc");
        expect(error.payloadType).toBe(2100);
    });

    it("hasErrorCode отличает валидный код от null", () => {
        expect(CTraderCommandError.hasErrorCode({ errorCode: "X", })).toBe(true);
        expect(CTraderCommandError.hasErrorCode({ errorCode: 1, })).toBe(true);
        expect(CTraderCommandError.hasErrorCode({ errorCode: null, })).toBe(false);
        expect(CTraderCommandError.hasErrorCode({})).toBe(false);
    });
});
