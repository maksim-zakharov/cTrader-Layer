import { CTraderCommandError } from "#CTraderCommandError";
import { CTraderCommandParameters } from "#commands/CTraderCommandParameters";
import { GenericObject } from "#utilities/GenericObject";

/**
 * Команда, ожидающая ответа от сервера cTrader.
 */
export class CTraderCommand {
    readonly #clientMsgId: string;
    readonly #responsePromise: Promise<GenericObject>;
    #response?: GenericObject;
    #resolve?: (response: GenericObject) => void;
    #reject?: (error: CTraderCommandError) => void;
    #timeout?: ReturnType<typeof setTimeout>;

    /**
     * @param parameters - Параметры команды (clientMsgId, timeoutMs)
     */
    public constructor ({
        clientMsgId, timeoutMs, onTimeout,
    }: CTraderCommandParameters) {
        this.#clientMsgId = clientMsgId;
        this.#responsePromise = new Promise((resolve: (response: GenericObject) => void,
            reject: (error: CTraderCommandError) => void) => {
            this.#resolve = resolve;
            this.#reject = reject;
        });
        this.#response = undefined;

        if (timeoutMs && timeoutMs > 0) {
            this.#timeout = setTimeout(() => {
                this.#timeout = undefined;
                onTimeout?.();
                this.reject(new CTraderCommandError({
                    errorCode: "COMMAND_TIMEOUT",
                    description: `Команда не ответила за ${timeoutMs} мс`,
                }, { clientMsgId, }));
            }, timeoutMs);
        }
    }

    public get clientMsgId (): string {
        return this.#clientMsgId;
    }

    public get responsePromise (): Promise<GenericObject> {
        return this.#responsePromise;
    }

    public get response (): GenericObject | undefined {
        return this.#response;
    }

    /**
     * Разрешает промис команды ответом сервера.
     * @param response - Payload ответа
     */
    public resolve (response: GenericObject): void {
        if (!this.#resolve) {
            return;
        }

        this.#clearTimeout();
        this.#response = response;
        this.#resolve(response);
        this.#resolve = undefined;
        this.#reject = undefined;
    }

    /**
     * Отклоняет промис команды ошибкой.
     * @param error - Ошибка команды
     */
    public reject (error: CTraderCommandError): void {
        if (!this.#reject) {
            return;
        }

        this.#clearTimeout();
        this.#reject(error);
        this.#resolve = undefined;
        this.#reject = undefined;
    }

    #clearTimeout (): void {
        if (this.#timeout) {
            clearTimeout(this.#timeout);
            this.#timeout = undefined;
        }
    }
}
