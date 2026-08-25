import { CTraderCommand } from "#commands/CTraderCommand";
import { CTraderCommandError } from "#CTraderCommandError";

describe("CTraderCommand", () => {
    afterEach(() => {
        jest.useRealTimers();
    });
    it("резолвит промис ответом", async () => {
        const command = new CTraderCommand({ clientMsgId: "id-1", });
        const payload = { version: "1", };

        command.resolve(payload);
        await expect(command.responsePromise).resolves.toEqual(payload);
        expect(command.response).toEqual(payload);
    });

    it("реджектит промис ошибкой", async () => {
        const command = new CTraderCommand({ clientMsgId: "id-2", });
        const error = new CTraderCommandError({ errorCode: "CH_NOT_FOUND", description: "нет", });

        command.reject(error);
        await expect(command.responsePromise).rejects.toBe(error);
    });

    it("повторный resolve не меняет результат", async () => {
        const command = new CTraderCommand({ clientMsgId: "id-3", });

        command.resolve({ a: 1, });
        command.resolve({ a: 2, });
        await expect(command.responsePromise).resolves.toEqual({ a: 1, });
    });

    it("срабатывает таймаут и вызывает onTimeout", async () => {
        jest.useFakeTimers();
        const onTimeout = jest.fn();
        const command = new CTraderCommand({
            clientMsgId: "id-4",
            timeoutMs: 20,
            onTimeout,
        });

        jest.advanceTimersByTime(20);
        await expect(command.responsePromise).rejects.toMatchObject({
            errorCode: "COMMAND_TIMEOUT",
        });
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("resolve отменяет таймаут", async () => {
        jest.useFakeTimers();
        const onTimeout = jest.fn();
        const command = new CTraderCommand({
            clientMsgId: "id-5",
            timeoutMs: 50,
            onTimeout,
        });

        command.resolve({ ok: true, });
        jest.advanceTimersByTime(70);
        expect(onTimeout).not.toHaveBeenCalled();
        await expect(command.responsePromise).resolves.toEqual({ ok: true, });
    });
});
