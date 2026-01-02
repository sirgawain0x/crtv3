import { eth_getBlockByNumber } from '../rpc/actions.js';
import { getFilterFactories, getFilterFromBlock, getFilterToBlock, isAddressFactory, } from './filter.js';
import { getFactoryFragments, getFragments, recoverFilter, } from './fragments.js';
import { MAX_CHECKPOINT, blockToCheckpoint, encodeCheckpoint, } from '../utils/checkpoint.js';
import { intervalBounds, intervalDifference, intervalIntersection, intervalIntersectionMany, intervalUnion, sortIntervals, } from '../utils/interval.js';
import { hexToNumber, numberToHex, toHex } from "viem";
export async function getLocalSyncProgress(params) {
    const syncProgress = {
        isEnd: () => {
            if (syncProgress.end === undefined ||
                syncProgress.current === undefined) {
                return false;
            }
            return (hexToNumber(syncProgress.current.number) >=
                hexToNumber(syncProgress.end.number));
        },
        isFinalized: () => {
            if (syncProgress.current === undefined) {
                return false;
            }
            return (hexToNumber(syncProgress.current.number) >=
                hexToNumber(syncProgress.finalized.number));
        },
        getCheckpoint: ({ tag }) => {
            if (tag === "end" && syncProgress.end === undefined) {
                return undefined;
            }
            // Note: `current` is guaranteed to be defined because it is only used once the historical
            // backfill is complete.
            const block = syncProgress[tag];
            return encodeCheckpoint(blockToCheckpoint(block, params.chain.id, 
            // The checkpoint returned by this function is meant to be used in
            // a closed interval (includes endpoints), so "start" should be inclusive.
            tag === "start" ? "down" : "up"));
        },
    };
    // Earliest `fromBlock` among all `filters`
    const start = Math.min(...params.filters.map(getFilterFromBlock));
    const cached = getCachedBlock({
        filters: params.filters,
        cachedIntervals: params.cachedIntervals,
    });
    const diagnostics = await Promise.all(cached === undefined
        ? [
            eth_getBlockByNumber(params.rpc, [numberToHex(start), false], {
                retryNullBlockRequest: true,
            }),
        ]
        : [
            eth_getBlockByNumber(params.rpc, [numberToHex(start), false], {
                retryNullBlockRequest: true,
            }),
            eth_getBlockByNumber(params.rpc, [numberToHex(cached), false], {
                retryNullBlockRequest: true,
            }),
        ]);
    syncProgress.finalized = params.finalizedBlock;
    syncProgress.start = diagnostics[0];
    if (diagnostics.length === 2) {
        syncProgress.current = diagnostics[1];
    }
    if (params.filters.some((filter) => filter.toBlock === undefined)) {
        return syncProgress;
    }
    // Latest `toBlock` among all `filters`
    const end = Math.max(...params.filters.map((filter) => filter.toBlock));
    if (end > hexToNumber(params.finalizedBlock.number)) {
        syncProgress.end = {
            number: toHex(end),
            hash: "0x",
            parentHash: "0x",
            timestamp: toHex(MAX_CHECKPOINT.blockTimestamp),
        };
    }
    else {
        syncProgress.end = await eth_getBlockByNumber(params.rpc, [numberToHex(end), false], { retryNullBlockRequest: true });
    }
    return syncProgress;
}
export async function getChildAddresses(params) {
    const childAddresses = new Map();
    for (const filter of params.filters) {
        switch (filter.type) {
            case "log":
                if (isAddressFactory(filter.address)) {
                    const _childAddresses = await params.syncStore.getChildAddresses({
                        factory: filter.address,
                    });
                    childAddresses.set(filter.address.id, _childAddresses);
                }
                break;
            case "transaction":
            case "transfer":
            case "trace":
                if (isAddressFactory(filter.fromAddress)) {
                    const _childAddresses = await params.syncStore.getChildAddresses({
                        factory: filter.fromAddress,
                    });
                    childAddresses.set(filter.fromAddress.id, _childAddresses);
                }
                if (isAddressFactory(filter.toAddress)) {
                    const _childAddresses = await params.syncStore.getChildAddresses({
                        factory: filter.toAddress,
                    });
                    childAddresses.set(filter.toAddress.id, _childAddresses);
                }
                break;
        }
    }
    return childAddresses;
}
export async function getCachedIntervals(params) {
    /**
     * Intervals that have been completed for all filters in `args.filters`.
     *
     * Note: `intervalsCache` is not updated after a new interval is synced.
     */
    let cachedIntervals;
    if (params.chain.disableCache) {
        cachedIntervals = new Map();
        for (const filter of params.filters) {
            cachedIntervals.set(filter, []);
            for (const { fragment } of getFragments(filter)) {
                cachedIntervals.get(filter).push({ fragment, intervals: [] });
            }
            for (const factory of getFilterFactories(filter)) {
                cachedIntervals.set(factory, []);
                for (const fragment of getFactoryFragments(factory)) {
                    cachedIntervals.get(factory).push({ fragment, intervals: [] });
                }
            }
        }
    }
    else {
        cachedIntervals = await params.syncStore.getIntervals({
            filters: params.filters,
        });
    }
    return cachedIntervals;
}
/**
 * Returns the intervals that need to be synced to complete the `interval`
 * for all `filters`.
 *
 * @param params.filters - The filters to sync.
 * @param params.interval - The interval to sync.
 * @param params.cachedIntervals - The cached intervals for the filters.
 * @returns The intervals that need to be synced.
 */
export const getRequiredIntervals = (params) => {
    const requiredIntervals = [];
    for (const filter of params.filters) {
        const filterTotalIntervals = intervalIntersection([params.interval], [[filter.fromBlock ?? 0, filter.toBlock ?? Number.POSITIVE_INFINITY]]);
        let filterCachedIntervals = params.cachedIntervals.get(filter);
        const factories = getFilterFactories(filter);
        const missingFactoryIntervals = [];
        for (const factory of factories) {
            const factoryTotalIntervals = intervalIntersection([params.interval], [[factory.fromBlock ?? 0, factory.toBlock ?? Number.POSITIVE_INFINITY]]);
            missingFactoryIntervals.push(...intervalDifference(factoryTotalIntervals, intervalIntersectionMany(params.cachedIntervals
                .get(factory)
                .map(({ intervals }) => intervals))));
        }
        if (missingFactoryIntervals.length > 0) {
            const firstMissingFactoryBlock = sortIntervals(missingFactoryIntervals)[0][0];
            // Note: When a filter with a factory is missing blocks,
            // all blocks after the first missing block are also missing.
            filterCachedIntervals = filterCachedIntervals.map(({ fragment, intervals }) => {
                return {
                    fragment,
                    intervals: intervalDifference(intervals, [
                        [firstMissingFactoryBlock, params.interval[1]],
                    ]),
                };
            });
        }
        const missingIntervals = intervalDifference(filterTotalIntervals, intervalIntersectionMany(filterCachedIntervals.map(({ intervals }) => intervals)));
        requiredIntervals.push(...missingIntervals, ...missingFactoryIntervals);
    }
    return intervalUnion(requiredIntervals);
};
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
export const getRequiredIntervalsWithFilters = (params) => {
    const requiredIntervals = [];
    const requiredFactoryIntervals = [];
    // Determine the requests that need to be made, and which intervals need to be inserted.
    // Fragments are used to create a minimal filter, to avoid refetching data even if a filter
    // is only partially synced.
    for (const filter of params.filters) {
        const filterTotalIntervals = intervalIntersection([params.interval], [[filter.fromBlock ?? 0, filter.toBlock ?? Number.POSITIVE_INFINITY]]);
        let filterCachedIntervals = params.cachedIntervals.get(filter);
        const factories = getFilterFactories(filter);
        const missingFactoryIntervals = [];
        for (const factory of factories) {
            const factoryTotalIntervals = intervalIntersection([params.interval], [[factory.fromBlock ?? 0, factory.toBlock ?? Number.POSITIVE_INFINITY]]);
            missingFactoryIntervals.push(...intervalDifference(factoryTotalIntervals, intervalIntersectionMany(params.cachedIntervals
                .get(factory)
                .map(({ intervals }) => intervals))));
        }
        if (missingFactoryIntervals.length > 0) {
            const firstMissingFactoryBlock = sortIntervals(missingFactoryIntervals)[0][0];
            // Note: When a filter with a factory is missing blocks,
            // all blocks after the first missing block are also missing.
            filterCachedIntervals = filterCachedIntervals.map(({ fragment, intervals }) => {
                return {
                    fragment,
                    intervals: intervalDifference(intervals, [
                        [firstMissingFactoryBlock, params.interval[1]],
                    ]),
                };
            });
        }
        const requiredFragmentIntervals = [];
        for (const { fragment, intervals: fragmentIntervals, } of filterCachedIntervals) {
            const missingFragmentIntervals = intervalDifference(filterTotalIntervals, fragmentIntervals);
            if (missingFragmentIntervals.length > 0) {
                requiredFragmentIntervals.push({
                    fragment,
                    intervals: missingFragmentIntervals,
                });
            }
        }
        if (requiredFragmentIntervals.length > 0) {
            const requiredInterval = intervalBounds(requiredFragmentIntervals.flatMap(({ intervals }) => intervals));
            const requiredFilter = recoverFilter(filter, requiredFragmentIntervals.map(({ fragment }) => fragment));
            requiredIntervals.push({
                filter: requiredFilter,
                interval: requiredInterval,
            });
        }
        for (const factory of factories) {
            const factoryTotalIntervals = intervalIntersection([params.interval], [[factory.fromBlock ?? 0, factory.toBlock ?? Number.POSITIVE_INFINITY]]);
            const requiredFactoryFragmentIntervals = [];
            for (const { fragment, intervals: fragmentIntervals, } of params.cachedIntervals.get(factory)) {
                const missingFragmentIntervals = intervalDifference(factoryTotalIntervals, fragmentIntervals);
                if (missingFragmentIntervals.length > 0) {
                    requiredFactoryFragmentIntervals.push({
                        fragment,
                        intervals: missingFragmentIntervals,
                    });
                }
            }
            if (requiredFactoryFragmentIntervals.length > 0) {
                const requiredInterval = intervalBounds(requiredFactoryFragmentIntervals.flatMap(({ intervals }) => intervals));
                requiredFactoryIntervals.push({
                    factory,
                    interval: requiredInterval,
                });
            }
        }
    }
    return {
        intervals: requiredIntervals,
        factoryIntervals: requiredFactoryIntervals,
    };
};
/** Returns the closest-to-tip block that has been synced for all `filters`. */
export const getCachedBlock = ({ filters, cachedIntervals, }) => {
    const latestCompletedBlocks = filters.map((filter) => {
        const filterTotalInterval = [
            filter.fromBlock ?? 0,
            filter.toBlock ?? Number.POSITIVE_INFINITY,
        ];
        let filterCachedIntervals = cachedIntervals.get(filter);
        const factories = getFilterFactories(filter);
        const missingFactoryIntervals = [];
        for (const factory of factories) {
            const factoryTotalInterval = [
                factory.fromBlock ?? 0,
                factory.toBlock ?? Number.POSITIVE_INFINITY,
            ];
            missingFactoryIntervals.push(...intervalDifference([factoryTotalInterval], intervalIntersectionMany(cachedIntervals.get(factory).map(({ intervals }) => intervals))));
        }
        if (missingFactoryIntervals.length > 0) {
            const firstMissingFactoryBlock = sortIntervals(missingFactoryIntervals)[0][0];
            // Note: When a filter with a factory is missing blocks,
            // all blocks after the first missing block are also missing.
            filterCachedIntervals = filterCachedIntervals.map(({ fragment, intervals }) => {
                return {
                    fragment,
                    intervals: intervalDifference(intervals, [
                        [firstMissingFactoryBlock, filterTotalInterval[1]],
                    ]),
                };
            });
        }
        let missingIntervals = intervalDifference([filterTotalInterval], intervalIntersectionMany(filterCachedIntervals.map(({ intervals }) => intervals)));
        if (missingIntervals.length === 0 && missingFactoryIntervals.length === 0) {
            return getFilterToBlock(filter);
        }
        missingIntervals = sortIntervals([
            ...missingIntervals,
            ...missingFactoryIntervals,
        ]);
        if (missingIntervals[0][0] === 0)
            return undefined;
        // First missing block - 1 is the last completed block
        return missingIntervals[0][0] - 1;
    });
    if (latestCompletedBlocks.every((block) => block !== undefined)) {
        return Math.min(...latestCompletedBlocks);
    }
    return undefined;
};
//# sourceMappingURL=index.js.map