import { CTraderCommand } from "#commands/CTraderCommand";
import { CTraderCommandMapParameters } from "#commands/CTraderCommandMapParameters";
import { GenericObject } from "#utilities/GenericObject";

/**
 * Карта ожидающих команд по clientMsgId.
 */
export class CTraderCommandMap {
    readonly #openCommands: Map<string, CTraderCommand>;
    readonly #send: (data: Buffer) => void;

    /**
     * @param parameters - Параметры (функция отправки сообщений)
     */
    public constructor ({ send, }: CTraderCommandMapParameters) {
        this.#openCommands = new Map();
        this.#send = send;
    }

    public get openCommands (): CTraderCommand[] {
        return [ ...this.#openCommands.values(), ];
    }

    public create ({ clientMsgId, message, }: {
        clientMsgId: string;
        message: Buffer;
    }): Promise<GenericObject> {
        const command: CTraderCommand = new CTraderCommand({ clientMsgId, });

        this.#openCommands.set(clientMsgId, command);
        this.#send(message);

        return command.responsePromise;
    }

    public extractById (clientMsgId: string): CTraderCommand | undefined {
        const command: CTraderCommand | undefined = this.#openCommands.get(clientMsgId);

        if (!command) {
            return undefined;
        }

        this.#openCommands.delete(clientMsgId);

        return command;
    }

    /**
     * Отклоняет все ожидающие команды с указанной причиной.
     * @param reason - Причина отклонения
     */
    public rejectAll (reason: Error): void {
        for (const command of this.#openCommands.values()) {
            command.reject({ errorCode: "CONNECTION_CLOSED", description: reason.message, });
        }

        this.#openCommands.clear();
    }
}
