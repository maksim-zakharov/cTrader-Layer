import { GenericObject } from "#utilities/GenericObject";

function readErrorCode (payload: GenericObject): string | number {
    if (typeof payload.errorCode === "string" || typeof payload.errorCode === "number") {
        return payload.errorCode;
    }

    return "UNKNOWN";
}

function readRetryAfter (payload: GenericObject): number | undefined {
    const raw = payload.retryAfter;
    const value = typeof raw === "number" ? raw : Number(raw);

    if (Number.isFinite(value) && value > 0) {
        return Math.ceil(value);
    }

    return undefined;
}

function buildErrorMessage (payload: GenericObject): string {
    const errorCode = readErrorCode(payload);
    const description = typeof payload.description === "string" ? payload.description : undefined;

    return description ? `CTraderError ${errorCode}: ${description}` : `CTraderError ${errorCode}`;
}

/**
 * Ошибка команды cTrader Open API.
 * Promise sendCommand отклоняется этим классом при errorCode в ответе,
 * таймауте или закрытии соединения.
 */
export class CTraderCommandError extends Error {
    /** Код ошибки Open API или внутренний код слоя */
    readonly errorCode: string | number;

    /** Описание ошибки */
    readonly description?: string;

    /** Секунд до разблокировки payload type (BLOCKED_PAYLOAD_TYPE) */
    readonly retryAfter?: number;

    /** Исходный payload ответа */
    readonly payload: GenericObject;

    /** Идентификатор сообщения клиента */
    readonly clientMsgId?: string;

    /** Числовой тип payload */
    readonly payloadType?: number;

    /**
     * @param payload - Payload с errorCode и опциональными description/retryAfter
     * @param extras - clientMsgId и payloadType команды
     */
    public constructor (payload: GenericObject, extras?: {
        clientMsgId?: string;
        payloadType?: number;
    }) {
        super(buildErrorMessage(payload));
        this.name = "CTraderCommandError";
        this.errorCode = readErrorCode(payload);
        this.description = typeof payload.description === "string" ? payload.description : undefined;
        this.retryAfter = readRetryAfter(payload);
        this.payload = payload;
        this.clientMsgId = extras?.clientMsgId;
        this.payloadType = extras?.payloadType;
    }

    /**
     * Проверяет, содержит ли payload код ошибки Open API.
     * @param payload - Декодированный payload
     */
    public static hasErrorCode (payload: GenericObject): boolean {
        const errorCode = payload.errorCode;

        return typeof errorCode === "string" || typeof errorCode === "number";
    }
}
