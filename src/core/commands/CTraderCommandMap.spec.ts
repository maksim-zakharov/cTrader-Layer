import { CTraderCommandMap } from "#commands/CTraderCommandMap";
import { CTraderCommandError } from "#CTraderCommandError";

describe("CTraderCommandMap", () => {
    it("отправляет сообщение и резолвит команду по clientMsgId", async () => {
        const sent: Buffer[] = [];
        const map = new CTraderCommandMap({
            send: (data) => sent.push(data as Buffer),
        });
        const payload = Buffer.from("req");
        const promise = map.create({
            clientMsgId: "msg-1",
            message: payload,
        });

        expect(sent).toEqual([ payload, ]);
        const command = map.extractById("msg-1");

        expect(command).toBeDefined();
        command?.resolve({ ok: true, });
        await expect(promise).resolves.toEqual({ ok: true, });
        expect(map.openCommands).toHaveLength(0);
    });

    it("extractById возвращает undefined для пустого id", () => {
        const map = new CTraderCommandMap({ send: (): void => undefined, });

        expect(map.extractById("")).toBeUndefined();
        expect(map.extractById(undefined)).toBeUndefined();
    });

    it("rejectAll отклоняет все ожидающие команды и очищает карту", async () => {
        const map = new CTraderCommandMap({ send: (): void => undefined, });
        const first = map.create({ clientMsgId: "a", message: Buffer.from("a"), });
        const second = map.create({ clientMsgId: "b", message: Buffer.from("b"), });
        const error = new CTraderCommandError({
            errorCode: "CONNECTION_CLOSED",
            description: "закрыто",
        });

        map.rejectAll(error);
        expect(map.openCommands).toHaveLength(0);
        await expect(first).rejects.toBe(error);
        await expect(second).rejects.toBe(error);
    });

    it("таймаут удаляет команду из карты", async () => {
        const map = new CTraderCommandMap({ send: (): void => undefined, });
        const promise = map.create({
            clientMsgId: "slow",
            message: Buffer.from("x"),
            timeoutMs: 20,
        });

        expect(map.openCommands).toHaveLength(1);
        await expect(promise).rejects.toMatchObject({ errorCode: "COMMAND_TIMEOUT", });
        expect(map.openCommands).toHaveLength(0);
    });
});
