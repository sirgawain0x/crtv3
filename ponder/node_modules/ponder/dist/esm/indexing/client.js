import { dedupe } from '../utils/dedupe.js';
import { toLowerCase } from '../utils/lowercase.js';
import { orderObject } from '../utils/order.js';
import { startClock } from '../utils/timer.js';
import { wait } from '../utils/wait.js';
import { BlockNotFoundError, TransactionNotFoundError, TransactionReceiptNotFoundError, createClient, custom, decodeFunctionData, decodeFunctionResult, encodeFunctionData, encodeFunctionResult, getAbiItem, hexToNumber, multicall3Abi, publicActions, toFunctionSelector, toHex, } from "viem";
import { getProfilePatternKey, recordProfilePattern, recoverProfilePattern, } from "./profile.js";
const MULTICALL_SELECTOR = toFunctionSelector(getAbiItem({ abi: multicall3Abi, name: "aggregate3" }));
const SAMPLING_RATE = 10;
const DB_PREDICTION_THRESHOLD = 0.2;
const RPC_PREDICTION_THRESHOLD = 0.8;
const MAX_CONSTANT_PATTERN_COUNT = 10;
/**
 * RPC responses that are not cached. These are valid responses
 * that are sometimes erroneously returned by the RPC.
 *
 * `"0x"` is returned by `eth_call` and causes the `ContractFunctionZeroDataError`.
 * `null` is returned by `eth_getBlockByNumber` and `eth_getBlockByHash` and causes the `BlockNotFoundError`.
 */
const UNCACHED_RESPONSES = ["0x", null];
/** RPC methods that reference a block number. */
const blockDependentMethods = new Set([
    "eth_getBalance",
    "eth_getTransactionCount",
    "eth_getBlockByNumber",
    "eth_getBlockTransactionCountByNumber",
    "eth_getTransactionByBlockNumberAndIndex",
    "eth_call",
    "eth_estimateGas",
    "eth_feeHistory",
    "eth_getProof",
    "eth_getCode",
    "eth_getStorageAt",
    "eth_getUncleByBlockNumberAndIndex",
    "debug_traceBlockByNumber",
]);
/** RPC methods that don't reference a block number. */
const nonBlockDependentMethods = new Set([
    "eth_getBlockByHash",
    "eth_getTransactionByHash",
    "eth_getBlockTransactionCountByHash",
    "eth_getTransactionByBlockHashAndIndex",
    "eth_getTransactionConfirmations",
    "eth_getTransactionReceipt",
    "eth_getUncleByBlockHashAndIndex",
    "eth_getUncleCountByBlockHash",
    "debug_traceBlockByHash",
    "debug_traceTransaction",
    "debug_traceCall",
]);
/** Viem actions where the `block` property is optional and implicit. */
const blockDependentActions = [
    "getBalance",
    "call",
    "estimateGas",
    "getFeeHistory",
    "getProof",
    "getCode",
    "getStorageAt",
    "getEnsAddress",
    "getEnsAvatar",
    "getEnsName",
    "getEnsResolver",
    "getEnsText",
    "readContract",
    "multicall",
    "simulateContract",
];
/** Viem actions where the `block` property is required. */
const blockRequiredActions = [
    "getBlock",
    "getTransactionCount",
    "getBlockTransactionCount",
];
/** Viem actions where the `block` property is non-existent. */
const nonBlockDependentActions = [
    "getTransaction",
    "getTransactionReceipt",
    "getTransactionConfirmations",
];
/** Viem actions that should be retried if they fail. */
const retryableActions = [
    "readContract",
    "simulateContract",
    "multicall",
    "getBlock",
    "getTransaction",
    "getTransactionReceipt",
    "getTransactionConfirmations",
];
export const getCacheKey = (request) => {
    return toLowerCase(JSON.stringify(orderObject(request)));
};
export const encodeRequest = (request) => ({
    method: "eth_call",
    params: [
        {
            to: request.address,
            data: encodeFunctionData({
                abi: request.abi,
                functionName: request.functionName,
                args: request.args,
            }),
        },
        request.blockNumber === "latest" ? "latest" : toHex(request.blockNumber),
    ],
});
export const decodeResponse = (response) => {
    // Note: I don't actually remember why we had to add the try catch.
    try {
        return JSON.parse(response);
    }
    catch (error) {
        return response;
    }
};
export const createCachedViemClient = ({ common, indexingBuild, syncStore, eventCount, }) => {
    let event = undefined;
    const cache = new Map();
    const profile = new Map();
    const profileConstantLRU = new Map();
    for (const chain of indexingBuild.chains) {
        cache.set(chain.id, new Map());
    }
    const ponderActions = (client) => {
        const actions = {};
        const _publicActions = publicActions(client);
        const addProfilePattern = ({ pattern, hasConstant, }) => {
            const profilePatternKey = getProfilePatternKey(pattern);
            const eventName = event.eventCallback.name;
            if (profile.get(eventName).has(profilePatternKey)) {
                profile.get(eventName).get(profilePatternKey).count++;
                if (hasConstant) {
                    profileConstantLRU.get(eventName).delete(profilePatternKey);
                    profileConstantLRU.get(eventName).add(profilePatternKey);
                }
            }
            else {
                profile
                    .get(eventName)
                    .set(profilePatternKey, { pattern, hasConstant, count: 1 });
                if (hasConstant) {
                    profileConstantLRU.get(eventName).add(profilePatternKey);
                    if (profileConstantLRU.get(eventName).size > MAX_CONSTANT_PATTERN_COUNT) {
                        const firstKey = profileConstantLRU
                            .get(eventName)
                            .keys()
                            .next().value;
                        if (firstKey) {
                            profile.get(eventName).delete(firstKey);
                            profileConstantLRU.get(eventName).delete(firstKey);
                        }
                    }
                }
            }
        };
        const getPonderAction = (action) => {
            return ({ cache, blockNumber: userBlockNumber, ...args }) => {
                // Note: prediction only possible when block number is managed by Ponder.
                if (event.type !== "setup" &&
                    userBlockNumber === undefined &&
                    eventCount[event.eventCallback.name] % SAMPLING_RATE === 1) {
                    const eventName = event.eventCallback.name;
                    if (profile.has(eventName) === false) {
                        profile.set(eventName, new Map());
                        profileConstantLRU.set(eventName, new Set());
                    }
                    // profile "readContract" and "multicall" actions
                    if (action === "readContract") {
                        const recordPatternResult = recordProfilePattern({
                            event: event,
                            args: { ...args, cache },
                            hints: Array.from(profile.get(eventName).values()),
                        });
                        if (recordPatternResult) {
                            addProfilePattern(recordPatternResult);
                        }
                    }
                    else if (action === "multicall") {
                        const contracts = { ...args, cache }.contracts;
                        if (contracts.length < 10) {
                            for (const contract of contracts) {
                                const recordPatternResult = recordProfilePattern({
                                    event: event,
                                    args: contract,
                                    hints: Array.from(profile.get(eventName).values()),
                                });
                                if (recordPatternResult) {
                                    addProfilePattern(recordPatternResult);
                                }
                            }
                        }
                    }
                }
                const blockNumber = event.type === "setup" ? event.block : event.event.block.number;
                // @ts-expect-error
                return _publicActions[action]({
                    ...args,
                    ...(cache === "immutable"
                        ? { blockTag: "latest" }
                        : { blockNumber: userBlockNumber ?? blockNumber }),
                });
            };
        };
        const getRetryAction = (action, actionName) => {
            return async (...args) => {
                const RETRY_COUNT = 9;
                const BASE_DURATION = 125;
                for (let i = 0; i <= RETRY_COUNT; i++) {
                    try {
                        // @ts-ignore
                        return await action(...args);
                    }
                    catch (error) {
                        const eventName = event.type === "setup"
                            ? event.setupCallback.name
                            : event.eventCallback.name;
                        if ((error instanceof BlockNotFoundError === false &&
                            error instanceof TransactionNotFoundError === false &&
                            error instanceof TransactionReceiptNotFoundError === false &&
                            // Note: Another way to catch this error is:
                            // `error instanceof ContractFunctionExecutionError && error.cause instanceOf ContractFunctionZeroDataError`
                            error?.message?.includes("returned no data") ===
                                false) ||
                            i === RETRY_COUNT ||
                            args[0].retryEmptyResponse === false) {
                            const chain = indexingBuild.chains.find((n) => n.id === event.chain.id);
                            common.logger.warn({
                                msg: "Failed 'context.client' action",
                                action: actionName,
                                event: eventName,
                                chain: chain.name,
                                chain_id: chain.id,
                                retry_count: i,
                                error: error,
                            });
                            throw error;
                        }
                        const duration = BASE_DURATION * 2 ** i;
                        const chain = indexingBuild.chains.find((n) => n.id === event.chain.id);
                        common.logger.warn({
                            msg: "Failed 'context.client' action",
                            action: actionName,
                            event: eventName,
                            chain: chain.name,
                            chain_id: chain.id,
                            retry_count: i,
                            retry_delay: duration,
                            error: error,
                        });
                        await wait(duration);
                    }
                }
            };
        };
        for (const action of blockDependentActions) {
            actions[action] = getPonderAction(action);
        }
        for (const action of nonBlockDependentActions) {
            // @ts-ignore
            actions[action] = _publicActions[action];
        }
        for (const action of blockRequiredActions) {
            // @ts-ignore
            actions[action] = _publicActions[action];
        }
        for (const action of retryableActions) {
            // @ts-ignore
            actions[action] = getRetryAction(actions[action], action);
        }
        const actionsWithMetrics = {};
        for (const [action, actionFn] of Object.entries(actions)) {
            // @ts-ignore
            actionsWithMetrics[action] = async (...args) => {
                const endClock = startClock();
                try {
                    // @ts-ignore
                    return await actionFn(...args);
                }
                finally {
                    common.metrics.ponder_indexing_rpc_action_duration.observe({ action }, endClock());
                }
            };
        }
        return actionsWithMetrics;
    };
    return {
        getClient(chain) {
            const rpc = indexingBuild.rpcs[indexingBuild.chains.findIndex((n) => n === chain)];
            return createClient({
                transport: cachedTransport({
                    common,
                    chain,
                    rpc,
                    syncStore,
                    cache,
                    event: () => event,
                }),
                chain: chain.viemChain,
                // @ts-expect-error overriding `readContract` is not supported by viem
            }).extend(ponderActions);
        },
        async prefetch({ events }) {
            const context = {
                logger: common.logger.child({ action: "prefetch_rpc_requests" }),
            };
            const prefetchEndClock = startClock();
            // Use profiling metadata + next event batch to determine which
            // rpc requests are going to be made, and preload them into the cache.
            const prediction = [];
            for (const event of events) {
                if (profile.has(event.eventCallback.name)) {
                    for (const [, { pattern, count }] of profile.get(event.eventCallback.name)) {
                        // Expected value of times the prediction will be used.
                        const ev = (count * SAMPLING_RATE) / eventCount[event.eventCallback.name];
                        prediction.push({
                            ev,
                            request: recoverProfilePattern(pattern, event),
                        });
                    }
                }
            }
            const chainRequests = new Map();
            for (const chain of indexingBuild.chains) {
                chainRequests.set(chain.id, []);
            }
            for (const { ev, request } of dedupe(prediction, ({ request }) => getCacheKey(encodeRequest(request)))) {
                chainRequests.get(request.chainId).push({
                    ev,
                    request: encodeRequest(request),
                });
            }
            await Promise.all(Array.from(chainRequests.entries()).map(async ([chainId, requests]) => {
                const i = indexingBuild.chains.findIndex((n) => n.id === chainId);
                const chain = indexingBuild.chains[i];
                const rpc = indexingBuild.rpcs[i];
                const dbRequests = requests.filter(({ ev }) => ev > DB_PREDICTION_THRESHOLD);
                common.metrics.ponder_indexing_rpc_prefetch_total.inc({
                    chain: chain.name,
                    method: "eth_call",
                    type: "database",
                }, dbRequests.length);
                const cachedResults = await syncStore.getRpcRequestResults({
                    requests: dbRequests.map(({ request }) => request),
                    chainId,
                }, context);
                for (let i = 0; i < dbRequests.length; i++) {
                    const request = dbRequests[i];
                    const cachedResult = cachedResults[i];
                    if (cachedResult !== undefined) {
                        cache
                            .get(chainId)
                            .set(getCacheKey(request.request), cachedResult);
                    }
                    else if (request.ev > RPC_PREDICTION_THRESHOLD) {
                        const resultPromise = rpc
                            .request(request.request, context)
                            .then((result) => JSON.stringify(result))
                            .catch((error) => error);
                        common.metrics.ponder_indexing_rpc_prefetch_total.inc({
                            chain: chain.name,
                            method: "eth_call",
                            type: "rpc",
                        });
                        // Note: Unawaited request added to cache
                        cache
                            .get(chainId)
                            .set(getCacheKey(request.request), resultPromise);
                    }
                }
                if (dbRequests.length > 0) {
                    common.logger.debug({
                        msg: "Prefetched JSON-RPC requests",
                        chain: chain.name,
                        chain_id: chain.id,
                        request_count: dbRequests.length,
                        duration: prefetchEndClock(),
                    });
                }
            }));
        },
        clear() {
            for (const chain of indexingBuild.chains) {
                cache.get(chain.id).clear();
            }
        },
        set event(_event) {
            event = _event;
        },
    };
};
export const cachedTransport = ({ common, chain, rpc, syncStore, cache, event, }) => ({ chain: viemChain }) => custom({
    async request({ method, params }) {
        const _event = event();
        const context = {
            logger: common.logger.child({
                action: "cache JSON-RPC request",
                event: _event.type === "setup"
                    ? _event.setupCallback.name
                    : _event.eventCallback.name,
            }),
        };
        const body = { method, params };
        // multicall
        if (method === "eth_call" &&
            params[0]?.data?.startsWith(MULTICALL_SELECTOR)) {
            let blockNumber = undefined;
            [, blockNumber] = params;
            const multicallRequests = decodeFunctionData({
                abi: multicall3Abi,
                data: params[0].data,
            }).args[0];
            if (multicallRequests.length === 0) {
                // empty multicall result
                return "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";
            }
            const requests = multicallRequests.map((call) => ({
                method: "eth_call",
                params: [
                    {
                        to: call.target,
                        data: call.callData,
                    },
                    blockNumber ?? "latest",
                ],
            }));
            const results = new Map();
            const requestsToInsert = new Set();
            for (const request of requests) {
                const cacheKey = getCacheKey(request);
                if (cache.get(chain.id).has(cacheKey)) {
                    const cachedResult = cache.get(chain.id).get(cacheKey);
                    if (cachedResult instanceof Promise) {
                        common.metrics.ponder_indexing_rpc_requests_total.inc({
                            chain: chain.name,
                            method,
                            type: "prefetch_rpc",
                        });
                        const result = await cachedResult;
                        // Note: we don't attempt to cache or prefetch errors, instead relying on the eventual RPC request.
                        if (result instanceof Error)
                            continue;
                        if (UNCACHED_RESPONSES.includes(result) === false) {
                            requestsToInsert.add(request);
                        }
                        results.set(request, {
                            success: true,
                            returnData: decodeResponse(result),
                        });
                    }
                    else {
                        common.metrics.ponder_indexing_rpc_requests_total.inc({
                            chain: chain.name,
                            method,
                            type: "prefetch_database",
                        });
                        results.set(request, {
                            success: true,
                            returnData: decodeResponse(cachedResult),
                        });
                    }
                }
            }
            const dbRequests = requests.filter((request) => results.has(request) === false);
            const dbResults = await syncStore.getRpcRequestResults({ requests: dbRequests, chainId: chain.id }, context);
            for (let i = 0; i < dbRequests.length; i++) {
                const request = dbRequests[i];
                const result = dbResults[i];
                if (result !== undefined) {
                    common.metrics.ponder_indexing_rpc_requests_total.inc({
                        chain: chain.name,
                        method,
                        type: "database",
                    });
                    results.set(request, {
                        success: true,
                        returnData: decodeResponse(result),
                    });
                }
            }
            if (results.size < requests.length) {
                const _requests = requests.filter((request) => results.has(request) === false);
                const multicallResult = await rpc
                    .request({
                    method: "eth_call",
                    params: [
                        {
                            to: params[0].to,
                            data: encodeFunctionData({
                                abi: multicall3Abi,
                                functionName: "aggregate3",
                                args: [
                                    multicallRequests.filter((_, i) => results.has(requests[i]) === false),
                                ],
                            }),
                        },
                        blockNumber,
                    ],
                }, context)
                    .then((result) => decodeFunctionResult({
                    abi: multicall3Abi,
                    functionName: "aggregate3",
                    data: result,
                }));
                for (let i = 0; i < _requests.length; i++) {
                    const request = _requests[i];
                    const result = multicallResult[i];
                    if (result.success &&
                        UNCACHED_RESPONSES.includes(result.returnData) === false) {
                        requestsToInsert.add(request);
                    }
                    common.metrics.ponder_indexing_rpc_requests_total.inc({
                        chain: chain.name,
                        method,
                        type: "rpc",
                    });
                    results.set(request, result);
                }
            }
            const encodedBlockNumber = blockNumber === undefined
                ? undefined
                : blockNumber === "latest"
                    ? 0
                    : hexToNumber(blockNumber);
            // Note: insertRpcRequestResults errors can be ignored and not awaited, since
            // the response is already fetched.
            syncStore
                .insertRpcRequestResults({
                requests: Array.from(requestsToInsert).map((request) => ({
                    request,
                    blockNumber: encodedBlockNumber,
                    result: JSON.stringify(results.get(request).returnData),
                })),
                chainId: chain.id,
            }, context)
                .catch(() => { });
            // Note: at this point, it is an invariant that either `allowFailure` is true or
            // there are no failed requests.
            // Note: viem <= 2.23.6 had a bug with `encodeFunctionResult` which can be worked around by adding
            // another layer of array nesting.
            // Fixed by this commit https://github.com/wevm/viem/commit/9c442de0ff38ac1f654b5c751d292e9a9f8d574c
            const resultsToEncode = requests.map((request) => results.get(request));
            try {
                return encodeFunctionResult({
                    abi: multicall3Abi,
                    functionName: "aggregate3",
                    result: resultsToEncode,
                });
            }
            catch (e) {
                return encodeFunctionResult({
                    abi: multicall3Abi,
                    functionName: "aggregate3",
                    result: [
                        // @ts-expect-error known issue in viem <= 2.23.6
                        resultsToEncode,
                    ],
                });
            }
        }
        else if (blockDependentMethods.has(method) ||
            nonBlockDependentMethods.has(method)) {
            const blockNumber = extractBlockNumberParam(body);
            const encodedBlockNumber = blockNumber === undefined
                ? undefined
                : blockNumber === "latest"
                    ? 0
                    : hexToNumber(blockNumber);
            const cacheKey = getCacheKey(body);
            if (cache.get(chain.id).has(cacheKey)) {
                const cachedResult = cache.get(chain.id).get(cacheKey);
                // `cachedResult` is a Promise if the request had to be fetched from the RPC.
                if (cachedResult instanceof Promise) {
                    common.metrics.ponder_indexing_rpc_requests_total.inc({
                        chain: chain.name,
                        method,
                        type: "prefetch_rpc",
                    });
                    const result = await cachedResult;
                    if (result instanceof Error)
                        throw result;
                    if (UNCACHED_RESPONSES.includes(result) === false) {
                        // Note: insertRpcRequestResults errors can be ignored and not awaited, since
                        // the response is already fetched.
                        syncStore
                            .insertRpcRequestResults({
                            requests: [
                                {
                                    request: body,
                                    blockNumber: encodedBlockNumber,
                                    result,
                                },
                            ],
                            chainId: chain.id,
                        }, context)
                            .catch(() => { });
                    }
                    return decodeResponse(result);
                }
                else {
                    common.metrics.ponder_indexing_rpc_requests_total.inc({
                        chain: chain.name,
                        method,
                        type: "prefetch_database",
                    });
                }
                return decodeResponse(cachedResult);
            }
            const [cachedResult] = await syncStore.getRpcRequestResults({ requests: [body], chainId: chain.id }, context);
            if (cachedResult !== undefined) {
                common.metrics.ponder_indexing_rpc_requests_total.inc({
                    chain: chain.name,
                    method,
                    type: "database",
                });
                return decodeResponse(cachedResult);
            }
            common.metrics.ponder_indexing_rpc_requests_total.inc({
                chain: chain.name,
                method,
                type: "rpc",
            });
            const response = await rpc.request(body, context);
            if (UNCACHED_RESPONSES.includes(response) === false) {
                // Note: insertRpcRequestResults errors can be ignored and not awaited, since
                // the response is already fetched.
                syncStore
                    .insertRpcRequestResults({
                    requests: [
                        {
                            request: body,
                            blockNumber: encodedBlockNumber,
                            result: JSON.stringify(response),
                        },
                    ],
                    chainId: chain.id,
                }, context)
                    .catch(() => { });
            }
            return response;
        }
        else {
            return rpc.request(body, context);
        }
    },
})({ chain: viemChain, retryCount: 0 });
export const extractBlockNumberParam = (request) => {
    let blockNumber = undefined;
    switch (request.method) {
        case "eth_getBlockByNumber":
        case "eth_getBlockTransactionCountByNumber":
        case "eth_getTransactionByBlockNumberAndIndex":
        case "eth_getUncleByBlockNumberAndIndex":
        case "debug_traceBlockByNumber":
            // @ts-expect-error
            [blockNumber] = request.params;
            break;
        case "eth_getBalance":
        case "eth_call":
        case "eth_getCode":
        case "eth_estimateGas":
        case "eth_feeHistory":
        case "eth_getTransactionCount":
            // @ts-expect-error
            [, blockNumber] = request.params;
            break;
        case "eth_getProof":
        case "eth_getStorageAt":
            // @ts-expect-error
            [, , blockNumber] = request.params;
            break;
    }
    return blockNumber;
};
//# sourceMappingURL=client.js.map