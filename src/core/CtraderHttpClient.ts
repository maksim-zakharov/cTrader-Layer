import axios from "axios";
import { GenericObject } from "#utilities/GenericObject";

const SPOTWARE_CONNECT_BASE = "https://api.spotware.com/connect";

/**
 * HTTP-клиент Spotware Connect API (@internal).
 * Задел под обмен code→tokens и обработку 401/429.
 */
export class CtraderHttpClient {
    /**
     * Получает профиль по access token.
     * @param accessToken - Токен доступа
     */
    public static async getAccessTokenProfile (accessToken: string): Promise<GenericObject> {
        const response = await axios.get(`${SPOTWARE_CONNECT_BASE}/profile`, {
            headers: CtraderHttpClient.authorizationHeaders(accessToken),
        });

        return response.data as GenericObject;
    }

    /**
     * Получает список торговых аккаунтов по access token.
     * @param accessToken - Токен доступа
     */
    public static async getAccessTokenAccounts (accessToken: string): Promise<GenericObject[]> {
        const response = await axios.get(`${SPOTWARE_CONNECT_BASE}/tradingaccounts`, {
            headers: CtraderHttpClient.authorizationHeaders(accessToken),
        });
        const data = response.data;

        if (!Array.isArray(data)) {
            return [];
        }

        return data as GenericObject[];
    }

    /**
     * Заголовок Authorization Bearer.
     * @param accessToken - Токен доступа
     */
    public static authorizationHeaders (accessToken: string): { Authorization: string } {
        return { Authorization: `Bearer ${accessToken}`, };
    }
}
