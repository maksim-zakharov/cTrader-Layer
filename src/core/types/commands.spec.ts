import type {
    CTraderCommandMapTypes,
    CTraderCommandRequestOf,
    CTraderCommandResponseOf,
    ProtoOATraderResPayload,
    ProtoOAVersionResPayload,
} from "./index";

type AssertTrue<T extends true> = T;
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

describe("CTraderCommandMapTypes", () => {
    it("содержит прод-команды ctrader-server", () => {
        const keys: Array<keyof CTraderCommandMapTypes> = [
            "ProtoOAVersionReq",
            "ProtoOAApplicationAuthReq",
            "ProtoOAAccountAuthReq",
            "ProtoOAGetAccountListByAccessTokenReq",
            "ProtoOATraderReq",
            "ProtoOAReconcileReq",
            "ProtoOAGetPositionUnrealizedPnLReq",
            "ProtoOASymbolsListReq",
            "ProtoOASymbolByIdReq",
            "ProtoOASubscribeSpotsReq",
            "ProtoOAUnsubscribeSpotsReq",
            "ProtoOASubscribeLiveTrendbarReq",
            "ProtoOAUnsubscribeLiveTrendbarReq",
            "ProtoOAGetTrendbarsReq",
            "ProtoOASubscribeDepthQuotesReq",
            "ProtoOAUnsubscribeDepthQuotesReq",
            "ProtoOANewOrderReq",
            "ProtoOAClosePositionReq",
            "ProtoOADealListReq",
            "ProtoOACashFlowHistoryListReq",
        ];

        expect(keys.length).toBeGreaterThanOrEqual(20);
    });

    it("хелперы RequestOf/ResponseOf соответствуют карте", () => {
        type VersionRes = AssertTrue<
            Equals<CTraderCommandResponseOf<"ProtoOAVersionReq">, ProtoOAVersionResPayload>
        >;
        type TraderReq = AssertTrue<
            Equals<CTraderCommandRequestOf<"ProtoOATraderReq">, CTraderCommandMapTypes["ProtoOATraderReq"]["request"]>
        >;
        type TraderRes = AssertTrue<
            Equals<CTraderCommandResponseOf<"ProtoOATraderReq">, ProtoOATraderResPayload>
        >;

        const _checks: [VersionRes, TraderReq, TraderRes] = [true, true, true];

        expect(_checks).toEqual([true, true, true]);
    });
});
