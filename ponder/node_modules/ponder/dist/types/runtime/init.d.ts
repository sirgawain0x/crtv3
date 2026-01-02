import type { Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { Chain, EventCallback, IndexingBuild, RawEvent } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import { refetchLocalEvents } from "./historical.js";
import { type CachedIntervals, type ChildAddresses, type SyncProgress, getLocalSyncProgress } from "./index.js";
export declare function initEventGenerator(params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "chains" | "rpcs" | "finalizedBlocks">;
    chain: Chain;
    rpc: Rpc;
    eventCallbacks: EventCallback[];
    childAddresses: ChildAddresses;
    syncProgress: SyncProgress;
    cachedIntervals: CachedIntervals;
    from: string;
    to: string;
    limit: number;
    database: Database;
    isCatchup: boolean;
}): Promise<AsyncGenerator<{
    events: RawEvent[];
    checkpoint: string;
    blockRange: [number, number];
}, void, unknown>>;
export declare function initRefetchEvents(params: Parameters<typeof refetchLocalEvents>[0]): Promise<RawEvent[]>;
export declare function initSyncProgress(params: Parameters<typeof getLocalSyncProgress>[0]): Promise<SyncProgress>;
//# sourceMappingURL=init.d.ts.map