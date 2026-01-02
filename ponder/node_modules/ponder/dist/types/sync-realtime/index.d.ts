import type { Common } from '../internal/common.js';
import type { Chain, EventCallback, Factory, FactoryId, LightBlock, SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import type { SyncProgress } from '../runtime/index.js';
import { type Address } from "viem";
export type RealtimeSync = {
    /**
     * Fetch block event data and reconcile it into the local chain.
     *
     * @param block - The block to reconcile.
     */
    sync(block: SyncBlock | SyncBlockHeader, blockCallback?: (isAccepted: boolean) => void): AsyncGenerator<RealtimeSyncEvent>;
    onError(error: Error): void;
    /** Local chain of blocks that have not been finalized. */
    unfinalizedBlocks: LightBlock[];
};
export type BlockWithEventData = {
    block: SyncBlock | SyncBlockHeader;
    transactions: SyncTransaction[];
    transactionReceipts: SyncTransactionReceipt[];
    logs: SyncLog[];
    traces: SyncTrace[];
    childAddresses: Map<Factory, Set<Address>>;
};
export type RealtimeSyncEvent = ({
    type: "block";
    hasMatchedFilter: boolean;
    blockCallback?: (isAccepted: boolean) => void;
} & BlockWithEventData) | {
    type: "finalize";
    block: LightBlock;
} | {
    type: "reorg";
    block: LightBlock;
    reorgedBlocks: LightBlock[];
};
type CreateRealtimeSyncParameters = {
    common: Common;
    chain: Chain;
    rpc: Rpc;
    eventCallbacks: EventCallback[];
    syncProgress: Pick<SyncProgress, "finalized">;
    childAddresses: Map<FactoryId, Map<Address, number>>;
};
export declare const createRealtimeSync: (args: CreateRealtimeSyncParameters) => RealtimeSync;
export {};
//# sourceMappingURL=index.d.ts.map