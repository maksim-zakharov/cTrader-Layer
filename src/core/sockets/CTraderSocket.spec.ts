import { EventEmitter } from "events";
import * as tls from "tls";
import { CTraderSocket } from "#sockets/CTraderSocket";

jest.mock("tls", () => ({
    connect: jest.fn(),
}));

describe("CTraderSocket", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("подписывается на close, а не только на end", () => {
        const fakeTls = new EventEmitter() as EventEmitter & { setTimeout: jest.Mock; destroy: jest.Mock };
        fakeTls.setTimeout = jest.fn();
        fakeTls.destroy = jest.fn();
        (tls.connect as jest.Mock).mockImplementation((_options, callback: () => void) => {
            setImmediate(callback);

            return fakeTls;
        });

        const socket = new CTraderSocket({ host: "demo.ctraderapi.com", port: 5035, });
        const onClose = jest.fn();
        const onOpen = jest.fn();
        const onError = jest.fn();

        socket.onClose = onClose;
        socket.onOpen = onOpen;
        socket.onError = onError;
        socket.connect();

        expect(fakeTls.listenerCount("close")).toBe(1);
        expect(fakeTls.listenerCount("end")).toBe(0);
        expect(fakeTls.listenerCount("error")).toBe(1);
        expect(fakeTls.listenerCount("data")).toBe(1);

        fakeTls.emit("close");
        expect(onClose).toHaveBeenCalledTimes(1);

        fakeTls.emit("error", new Error("reset"));
        expect(onError).toHaveBeenCalledTimes(1);
    });

    it("передаёт host и servername в tls.connect", () => {
        const fakeTls = new EventEmitter() as EventEmitter & { setTimeout: jest.Mock; destroy: jest.Mock };
        fakeTls.setTimeout = jest.fn();
        fakeTls.destroy = jest.fn();
        (tls.connect as jest.Mock).mockReturnValue(fakeTls);

        const socket = new CTraderSocket({
            host: "live.ctraderapi.com",
            port: 5035,
            timeoutMs: 5000,
        });

        socket.connect();
        expect(tls.connect).toHaveBeenCalledWith({
            host: "live.ctraderapi.com",
            port: 5035,
            servername: "live.ctraderapi.com",
        }, expect.any(Function));
        expect(fakeTls.setTimeout).toHaveBeenCalledWith(5000);
    });

    it("при повторном connect уничтожает предыдущий сокет без close", () => {
        const first = new EventEmitter() as EventEmitter & { setTimeout: jest.Mock; destroy: jest.Mock; removeAllListeners: () => EventEmitter };
        const second = new EventEmitter() as EventEmitter & { setTimeout: jest.Mock; destroy: jest.Mock };
        first.setTimeout = jest.fn();
        first.destroy = jest.fn();
        second.setTimeout = jest.fn();
        second.destroy = jest.fn();

        (tls.connect as jest.Mock)
            .mockReturnValueOnce(first)
            .mockReturnValueOnce(second);

        const socket = new CTraderSocket({ host: "localhost", port: 1, });
        const onClose = jest.fn();

        socket.onClose = onClose;
        socket.connect();
        socket.connect();
        first.emit("close");
        expect(onClose).not.toHaveBeenCalled();
        expect(first.destroy).toHaveBeenCalled();
    });
});
