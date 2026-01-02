import type { Common } from '../internal/common.js';
import type { Chain, FactoryId, SyncBlock, SyncLog } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import type { IntervalWithFactory, IntervalWithFilter } from '../runtime/index.js';
import type { SyncStore } from '../sync-store/index.js';
import { type Interval } from '../utils/interval.js';
import { type Address } from "viem";
export type HistoricalSync = {
    /**
     * Sync block data that can be queried for a range of blocks (logs).
     */
    syncBlockRangeData(params: {
        interval: Interval;
        requiredIntervals: IntervalWithFilter[];
        requiredFactoryIntervals: IntervalWithFactory[];
        syncStore: SyncStore;
    }): Promise<SyncLog[]>;
    /**
     * Sync block data that must be queried for a single block (block, transactions, receipts, traces).
     */
    syncBlockData(params: {
        interval: Interval;
        requiredIntervals: IntervalWithFilter[];
        logs: SyncLog[];
        syncStore: SyncStore;
    }): Promise<SyncBlock | undefined>;
};
type CreateHistoricalSyncParameters = {
    common: Common;
    chain: Chain;
    rpc: Rpc;
    childAddresses: Map<FactoryId, Map<Address, number>>;
};
export declare const createHistoricalSync: (args: CreateHistoricalSyncParameters) => HistoricalSync;
export {};
//# sourceMappingURL=index.d.ts.map