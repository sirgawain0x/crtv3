import type { Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { Chain, Event, EventCallback, IndexingBuild } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import { type RealtimeSyncEvent } from '../sync-realtime/index.js';
import type { ChildAddresses, SyncProgress } from "./index.js";
export type RealtimeEvent = {
    type: "block";
    events: Event[];
    chain: Chain;
    checkpoint: string;
    blockCallback?: (isAccepted: boolean) => void;
} | {
    type: "reorg";
    chain: Chain;
    checkpoint: string;
} | {
    type: "finalize";
    chain: Chain;
    checkpoint: string;
};
export declare function getRealtimeEventsOmnichain(params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "chains" | "rpcs" | "finalizedBlocks">;
    perChainSync: Map<Chain, {
        syncProgress: SyncProgress;
        childAddresses: ChildAddresses;
        unfinalizedBlocks: Omit<Extract<RealtimeSyncEvent, {
            type: "block";
        }>, "type">[];
    }>;
    database: Database;
    pendingEvents: Event[];
}): AsyncGenerator<RealtimeEvent>;
export declare function getRealtimeEventsMultichain(params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "chains" | "rpcs" | "finalizedBlocks">;
    perChainSync: Map<Chain, {
        syncProgress: SyncProgress;
        childAddresses: ChildAddresses;
        unfinalizedBlocks: Omit<Extract<RealtimeSyncEvent, {
            type: "block";
        }>, "type">[];
    }>;
    database: Database;
}): AsyncGenerator<RealtimeEvent>;
export declare function getRealtimeEventsIsolated(params: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "chains" | "rpcs" | "finalizedBlocks">;
    chain: Chain;
    syncProgress: SyncProgress;
    childAddresses: ChildAddresses;
    unfinalizedBlocks: Omit<Extract<RealtimeSyncEvent, {
        type: "block";
    }>, "type">[];
    database: Database;
}): AsyncGenerator<RealtimeEvent>;
export declare function getRealtimeEventGenerator(params: {
    common: Common;
    chain: Chain;
    rpc: Rpc;
    eventCallbacks: EventCallback[];
    syncProgress: SyncProgress;
    childAddresses: ChildAddresses;
    database: Database;
}): AsyncGenerator<{
    chain: Chain;
    event: RealtimeSyncEvent;
}, void, unknown>;
export declare function handleRealtimeSyncEvent(event: RealtimeSyncEvent, params: {
    common: Common;
    chain: Chain;
    eventCallbacks: EventCallback[];
    syncProgress: SyncProgress;
    unfinalizedBlocks: Omit<Extract<RealtimeSyncEvent, {
        type: "block";
    }>, "type">[];
    database: Database;
}): Promise<void>;
/**
 * Merges multiple async generators into a single async generator while preserving
 * the order of "block" events.
 *
 * @dev "reorg" and "finalize" events are not ordered between chains.
 */
export declare function mergeAsyncGeneratorsWithRealtimeOrder(generators: AsyncGenerator<{
    chain: Chain;
    event: RealtimeSyncEvent;
}>[]): AsyncGenerator<{
    chain: Chain;
    event: RealtimeSyncEvent;
}>;
//# sourceMappingURL=realtime.d.ts.map