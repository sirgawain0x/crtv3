import * as _chains from "viem/chains";
export declare const chains: Record<string, _chains.Chain>;
export declare const hyperliquidEvm: {
    blockExplorers?: {
        [key: string]: {
            name: string;
            url: string;
            apiUrl?: string | undefined;
        };
        default: {
            name: string;
            url: string;
            apiUrl?: string | undefined;
        };
    } | undefined;
    contracts: {
        readonly multicall3: {
            readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
            readonly blockCreated: 13051;
        };
    };
    ensTlds?: readonly string[] | undefined;
    id: 999;
    name: "Hyperliquid EVM";
    nativeCurrency: {
        readonly name: "HYPE";
        readonly symbol: "HYPE";
        readonly decimals: 18;
    };
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.hyperliquid.xyz/evm"];
        };
    };
    sourceId?: number | undefined;
    testnet?: boolean | undefined;
    custom?: Record<string, unknown> | undefined;
    fees?: import("viem").ChainFees<undefined> | undefined;
    formatters?: undefined;
    serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
};
//# sourceMappingURL=chains.d.ts.map