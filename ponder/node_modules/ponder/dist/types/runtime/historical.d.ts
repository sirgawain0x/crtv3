import type { Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { Chain, CrashRecoveryCheckpoint, Event, EventCallback, IndexingBuild, RawEvent } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import { type SyncStore } from '../sync-store/index.js';
import { type CachedIntervals, type ChildAddresses, type SyncProgress } from "./index.js";
export declare function getHistoricalEventsOmnichain(params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "chains" | "rpcs" | "finalizedBlocks">;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    perChainSync: Map<Chain, {
        syncProgress: SyncProgress;
        childAddresses: ChildAddresses;
        cachedIntervals: CachedIntervals;
    }>;
    database: Database;
}): AsyncGenerator<{
    type: "events";
    result: {
        chainId: number;
        events: Event[];
        checkpoint: string;
        blockRange: [number, number];
    }[];
} | {
    type: "pending";
    result: Event[];
}>;
export declare function getHistoricalEventsMultichain(params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "chains" | "rpcs" | "finalizedBlocks">;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    perChainSync: Map<Chain, {
        syncProgress: SyncProgress;
        childAddresses: ChildAddresses;
        cachedIntervals: CachedIntervals;
    }>;
    database: Database;
}): AsyncGenerator<{
    chainId: number;
    events: Event[];
    checkpoint: string;
    blockRange: [number, number];
}, void, unknown>;
export declare function getHistoricalEventsIsolated(params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "chains" | "rpcs" | "finalizedBlocks">;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    chain: Chain;
    syncProgress: SyncProgress;
    childAddresses: ChildAddresses;
    cachedIntervals: CachedIntervals;
    database: Database;
}): AsyncGenerator<{
    chainId: number;
    events: Event[];
    checkpoint: string;
    blockRange: [number, number];
}, void, unknown>;
export declare function refetchHistoricalEvents(params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "chains">;
    perChainSync: Map<Chain, {
        childAddresses: ChildAddresses;
    }>;
    events: Event[];
    syncStore: SyncStore;
}): Promise<Event[]>;
export declare function refetchLocalEvents(params: {
    common: Common;
    chain: Chain;
    childAddresses: ChildAddresses;
    eventCallbacks: EventCallback[];
    events: Event[];
    syncStore: SyncStore;
}): Promise<RawEvent[]>;
export declare function getLocalEventGenerator(params: {
    common: Common;
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
}): AsyncGenerator<{
    events: RawEvent[];
    checkpoint: string;
    blockRange: [number, number];
}, void, unknown>;
export declare function getLocalSyncGenerator(params: {
    common: Common;
    chain: Chain;
    rpc: Rpc;
    eventCallbacks: EventCallback[];
    syncProgress: SyncProgress;
    childAddresses: ChildAddresses;
    cachedIntervals: CachedIntervals;
    database: Database;
    isCatchup: boolean;
}): AsyncGenerator<number, void, unknown>;
/**
 * Merges multiple event generators into a single generator while preserving
 * the order of events.
 *
 * @param generators - Generators to merge.
 * @returns A single generator that yields events from all generators.
 */
export declare function mergeAsyncGeneratorsWithEventOrder(generators: AsyncGenerator<{
    events: Event[];
    checkpoint: string;
    blockRange: [number, number];
}>[]): AsyncGenerator<{
    chainId: number;
    events: Event[];
    checkpoint: string;
    blockRange: [number, number];
}[]>;
//# sourceMappingURL=historical.d.ts.map