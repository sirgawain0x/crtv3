import type { Common } from '../internal/common.js';
import type { Chain, Factory, FactoryId, Filter, Fragment, LightBlock } from '../internal/types.js';
import type { SyncBlock } from '../internal/types.js';
import type { Rpc } from '../rpc/index.js';
import type { SyncStore } from '../sync-store/index.js';
import { type Interval } from '../utils/interval.js';
import { type Address } from "viem";
export type SyncProgress = {
    start: SyncBlock | LightBlock;
    end: SyncBlock | LightBlock | undefined;
    current: SyncBlock | LightBlock | undefined;
    finalized: SyncBlock | LightBlock;
    isEnd: () => boolean;
    isFinalized: () => boolean;
    getCheckpoint: <tag extends "start" | "end" | "current" | "finalized">({ tag, }: {
        tag: tag;
    }) => tag extends "end" ? string | undefined : string;
};
export type ChildAddresses = Map<FactoryId, Map<Address, number>>;
export type CachedIntervals = Map<Filter | Factory, {
    fragment: Fragment;
    intervals: Interval[];
}[]>;
export type IntervalWithFilter = {
    interval: Interval;
    filter: Filter;
};
export type IntervalWithFactory = {
    interval: Interval;
    factory: Factory;
};
export declare function getLocalSyncProgress(params: {
    common: Common;
    chain: Chain;
    rpc: Rpc;
    filters: Filter[];
    finalizedBlock: LightBlock;
    cachedIntervals: CachedIntervals;
}): Promise<SyncProgress>;
export declare function getChildAddresses(params: {
    filters: Filter[];
    syncStore: SyncStore;
}): Promise<ChildAddresses>;
export declare function getCachedIntervals(params: {
    chain: Chain;
    filters: Filter[];
    syncStore: SyncStore;
}): Promise<CachedIntervals>;
/**
 * Returns the intervals that need to be synced to complete the `interval`
 * for all `filters`.
 *
 * @param params.filters - The filters to sync.
 * @param params.interval - The interval to sync.
 * @param params.cachedIntervals - The cached intervals for the filters.
 * @returns The intervals that need to be synced.
 */
export declare const getRequiredIntervals: (params: {
    filters: Filter[];
    interval: Interval;
    cachedIntervals: CachedIntervals;
}) => Interval[];
/**
 * Returns the intervals that need to be synced to complete the `interval`
 * for all `filters`.
 *
 * Note: This function dynamically builds filters using `recoverFilter`.
 * Fragments are used to create a minimal filter, to avoid refetching data
 * even if a filter is only partially synced.
 *
 * @param params.filters - The filters to sync.
 * @param params.interval - The interval to sync.
 * @param params.cachedIntervals - The cached intervals for the filters.
 * @returns The intervals that need to be synced.
 */
export declare const getRequiredIntervalsWithFilters: (params: {
    filters: Filter[];
    interval: Interval;
    cachedIntervals: CachedIntervals;
}) => {
    intervals: IntervalWithFilter[];
    factoryIntervals: IntervalWithFactory[];
};
/** Returns the closest-to-tip block that has been synced for all `filters`. */
export declare const getCachedBlock: ({ filters, cachedIntervals, }: {
    filters: Filter[];
    cachedIntervals: CachedIntervals;
}) => number | undefined;
//# sourceMappingURL=index.d.ts.map