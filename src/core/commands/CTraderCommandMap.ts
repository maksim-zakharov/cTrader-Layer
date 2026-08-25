import type { CTraderEncodable } from "#types";
import { CTraderCommand } from "#commands/CTraderCommand";
import { CTraderCommandError } from "#CTraderCommandError";
import { CTraderCommandMapParameters } from "#commands/CTraderCommandMapParameters";
import { GenericObject } from "#utilities/GenericObject";

/**
 * Карта ожидающих команд по clientMsgId.
 */
export class CTraderCommandMap {
    readonly #openCommands: Map<string, CTraderCommand>;
    readonly #send: (data: CTraderEncodable) => void;

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

    /**
     * Создаёт ожидающую команду, отправляет сообщение и возвращает промис ответа.
     * @param parameters - clientMsgId, сообщение и таймаут
     */
    public create ({
        clientMsgId, message, timeoutMs,
    }: {
        clientMsgId: string;
        message: CTraderEncodable;
        timeoutMs?: number;
    }): Promise<GenericObject> {
        const command: CTraderCommand = new CTraderCommand({
            clientMsgId,
            timeoutMs,
            onTimeout: (): void => {
                this.#openCommands.delete(clientMsgId);
            },
        });

        this.#openCommands.set(clientMsgId, command);
        this.#send(message);

        return command.responsePromise;
    }

    /**
     * Извлекает команду по clientMsgId и удаляет её из карты.
     * @param clientMsgId - Идентификатор сообщения
     */
    public extractById (clientMsgId: string | undefined): CTraderCommand | undefined {
        if (!clientMsgId) {
            return undefined;
        }

        const command: CTraderCommand | undefined = this.#openCommands.get(clientMsgId);

        if (!command) {
            return undefined;
        }

        this.#openCommands.delete(clientMsgId);

        return command;
    }

    /**
     * Отклоняет все ожидающие команды с указанной причиной.
     * @param error - Ошибка для reject
     */
    public rejectAll (error: CTraderCommandError): void {
        for (const command of this.#openCommands.values()) {
            command.reject(error);
        }

        this.#openCommands.clear();
    }
}
