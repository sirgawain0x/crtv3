import type { Common } from '../internal/common.js';
import type { Logger } from '../internal/logger.js';
import type { Chain, SyncBlock, SyncBlockHeader } from '../internal/types.js';
import { type EIP1193Parameters, type Hash, type PublicRpcSchema, type RpcTransactionReceipt } from "viem";
import type { DebugRpcSchema } from "../utils/debug.js";
export type RpcSchema = [
    ...PublicRpcSchema,
    ...DebugRpcSchema,
    /**
     * @description Returns the receipts of a block specified by hash
     *
     * @example
     * provider.request({ method: 'eth_getBlockReceipts', params: ['0x...'] })
     * // => [{ ... }, { ... }]
     */
    {
        Method: "eth_getBlockReceipts";
        Parameters: [hash: Hash];
        ReturnType: RpcTransactionReceipt[] | null;
    }
];
export type RequestParameters = EIP1193Parameters<RpcSchema>;
export type RequestReturnType<method extends EIP1193Parameters<RpcSchema>["method"]> = Extract<RpcSchema[number], {
    Method: method;
}>["ReturnType"];
export type Rpc = {
    hostnames: string[];
    request: <TParameters extends RequestParameters>(parameters: TParameters, context?: {
        logger?: Logger;
        retryNullBlockRequest?: boolean;
    }) => Promise<RequestReturnType<TParameters["method"]>>;
    subscribe: (params: {
        onBlock: (block: SyncBlock | SyncBlockHeader) => Promise<boolean>;
        onError: (error: Error) => void;
    }) => void;
    unsubscribe: () => Promise<void>;
};
export declare const createRpc: ({ common, chain, concurrency, }: {
    common: Common;
    chain: Chain;
    concurrency?: number | undefined;
}) => Rpc;
//# sourceMappingURL=index.d.ts.map