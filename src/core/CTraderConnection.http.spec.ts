import axios from "axios";
import { CTraderConnection } from "#CTraderConnection";

jest.mock("axios");

describe("CTraderConnection HTTP", () => {
    const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

    beforeEach(() => {
        mockedGet.mockReset();
    });

    it("передаёт access token в заголовке Authorization для профиля", async () => {
        mockedGet.mockResolvedValue({ data: { email: "a@b.c", }, } as never);

        const profile = await CTraderConnection.getAccessTokenProfile("token-1");

        expect(profile).toEqual({ email: "a@b.c", });
        expect(mockedGet).toHaveBeenCalledWith(
            "https://api.spotware.com/connect/profile",
            { headers: { Authorization: "Bearer token-1", }, },
        );
    });

    it("передаёт access token в заголовке Authorization для аккаунтов", async () => {
        mockedGet.mockResolvedValue({ data: [ { accountId: 1, }, ], } as never);

        const accounts = await CTraderConnection.getAccessTokenAccounts("token-2");

        expect(accounts).toEqual([ { accountId: 1, }, ]);
        expect(mockedGet).toHaveBeenCalledWith(
            "https://api.spotware.com/connect/tradingaccounts",
            { headers: { Authorization: "Bearer token-2", }, },
        );
    });

    it("возвращает пустой массив, если ответ не массив", async () => {
        mockedGet.mockResolvedValue({ data: { error: true, }, } as never);

        await expect(CTraderConnection.getAccessTokenAccounts("token-3")).resolves.toEqual([]);
    });
});
