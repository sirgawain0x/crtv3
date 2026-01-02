import type { LightBlock, SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt } from '../internal/types.js';
import type { RequestParameters, Rpc } from './index.js';
/**
 * Helper function for "eth_getBlockByNumber" request.
 */
export declare const eth_getBlockByNumber: <params extends [block: `0x${string}` | import("viem").BlockTag, includeTransactionObjects: boolean]>(rpc: Rpc, params: params, context?: Parameters<Rpc["request"]>[1]) => Promise<params[1] extends true ? {
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
} : LightBlock>;
/**
 * Helper function for "eth_getBlockByHash" request.
 */
export declare const eth_getBlockByHash: <params extends [hash: `0x${string}`, includeTransactionObjects: boolean]>(rpc: Rpc, params: params, context?: Parameters<Rpc["request"]>[1]) => Promise<params[1] extends true ? {
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
} : LightBlock>;
/**
 * Helper function for "eth_getLogs" rpc request.
 * Handles different error types and retries the request if applicable.
 */
export declare const eth_getLogs: (rpc: Rpc, params: Extract<RequestParameters, {
    method: "eth_getLogs";
}>["params"], context?: Parameters<Rpc["request"]>[1]) => Promise<SyncLog[]>;
/**
 * Helper function for "eth_getTransactionReceipt" request.
 */
export declare const eth_getTransactionReceipt: (rpc: Rpc, params: Extract<RequestParameters, {
    method: "eth_getTransactionReceipt";
}>["params"], context?: Parameters<Rpc["request"]>[1]) => Promise<SyncTransactionReceipt>;
/**
 * Helper function for "eth_getBlockReceipts" request.
 */
export declare const eth_getBlockReceipts: (rpc: Rpc, params: Extract<RequestParameters, {
    method: "eth_getBlockReceipts";
}>["params"], context?: Parameters<Rpc["request"]>[1]) => Promise<SyncTransactionReceipt[]>;
/**
 * Helper function for "debug_traceBlockByNumber" request.
 */
export declare const debug_traceBlockByNumber: (rpc: Rpc, params: Extract<RequestParameters, {
    method: "debug_traceBlockByNumber";
}>["params"], context?: Parameters<Rpc["request"]>[1]) => Promise<SyncTrace[]>;
/**
 * Helper function for "debug_traceBlockByHash" request.
 */
export declare const debug_traceBlockByHash: (rpc: Rpc, params: Extract<RequestParameters, {
    method: "debug_traceBlockByHash";
}>["params"], context?: Parameters<Rpc["request"]>[1]) => Promise<SyncTrace[]>;
/**
 * Validate that the transactions are consistent with the block.
 */
export declare const validateTransactionsAndBlock: (block: SyncBlock, request: Extract<RequestParameters, {
    method: "eth_getBlockByNumber" | "eth_getBlockByHash";
}>) => void;
/**
 * Validate that the logs are consistent with the block.
 *
 * @dev Allows `log.transactionHash` to be `zeroHash`.
 * @dev Allows `block.logsBloom` to be `zeroLogsBloom`.
 */
export declare const validateLogsAndBlock: (logs: SyncLog[], block: SyncBlock, logsRequest: Extract<RequestParameters, {
    method: "eth_getLogs";
}>, blockRequest: Extract<RequestParameters, {
    method: "eth_getBlockByNumber" | "eth_getBlockByHash";
}>) => void;
/**
 * Validate that the traces are consistent with the block.
 */
export declare const validateTracesAndBlock: (traces: SyncTrace[], block: SyncBlock, tracesRequest: Extract<RequestParameters, {
    method: "debug_traceBlockByNumber" | "debug_traceBlockByHash";
}>, blockRequest: Extract<RequestParameters, {
    method: "eth_getBlockByNumber" | "eth_getBlockByHash";
}>) => void;
/**
 * Validate that the receipts are consistent with the block.
 */
export declare const validateReceiptsAndBlock: (receipts: SyncTransactionReceipt[], block: SyncBlock, receiptsRequest: Extract<RequestParameters, {
    method: "eth_getBlockReceipts" | "eth_getTransactionReceipt";
}>, blockRequest: Extract<RequestParameters, {
    method: "eth_getBlockByNumber" | "eth_getBlockByHash";
}>) => void;
/**
 * Validate required block properties and set non-required properties.
 *
 * Required properties:
 * - hash
 * - number
 * - timestamp
 * - logsBloom
 * - parentHash
 * - transactions
 *
 * Non-required properties:
 * - miner
 * - gasUsed
 * - gasLimit
 * - baseFeePerGas
 * - nonce
 * - mixHash
 * - stateRoot
 * - transactionsRoot
 * - sha3Uncles
 * - size
 * - difficulty
 * - totalDifficulty
 * - extraData
 */
export declare const standardizeBlock: <block extends {
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
} | (Omit<{
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
}, "transactions"> & {
    transactions: string[] | undefined;
})>(block: block, request: Extract<RequestParameters, {
    method: "eth_getBlockByNumber" | "eth_getBlockByHash";
}> | {
    method: "eth_subscribe";
    params: ["newHeads"];
}) => block extends {
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
} ? {
    baseFeePerGas: `0x${string}` | null;
    blobGasUsed: `0x${string}`;
    difficulty: `0x${string}`;
    excessBlobGas: `0x${string}`;
    extraData: `0x${string}`;
    gasLimit: `0x${string}`;
    gasUsed: `0x${string}`;
    hash: `0x${string}`;
    logsBloom: `0x${string}`;
    miner: `0x${string}`;
    mixHash: `0x${string}`;
    nonce: `0x${string}`;
    number: `0x${string}`;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: `0x${string}`;
    receiptsRoot: `0x${string}`;
    sealFields: `0x${string}`[];
    sha3Uncles: `0x${string}`;
    size: `0x${string}`;
    stateRoot: `0x${string}`;
    timestamp: `0x${string}`;
    totalDifficulty: `0x${string}` | null;
    transactions: import("viem").RpcTransaction<false>[];
    transactionsRoot: `0x${string}`;
    uncles: `0x${string}`[];
    withdrawals?: import("viem").Withdrawal[] | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
} : SyncBlockHeader;
/**
 * Validate required transaction properties and set non-required properties.
 *
 * Required properties:
 * - hash
 * - transactionIndex
 * - blockNumber
 * - blockHash
 * - from
 * - to
 *
 * Non-required properties:
 * - input
 * - value
 * - nonce
 * - r
 * - s
 * - v
 * - type
 * - gas
 */
export declare const standardizeTransactions: (transactions: SyncTransaction[], request: Extract<RequestParameters, {
    method: "eth_getBlockByNumber" | "eth_getBlockByHash";
}>) => SyncTransaction[];
/**
 * Validate required log properties and set properties.
 *
 * Required properties:
 * - blockNumber
 * - logIndex
 * - blockHash
 * - address
 * - topics
 * - data
 * - transactionHash
 * - transactionIndex
 *
 * Non-required properties:
 * - removed
 */
export declare const standardizeLogs: (logs: SyncLog[], request: Extract<RequestParameters, {
    method: "eth_getLogs";
}>) => SyncLog[];
/**
 * Validate required trace properties and set non-required properties.
 *
 * Required properties:
 * - transactionHash
 * - type
 * - from
 * - input
 *
 * Non-required properties:
 * - gas
 * - gasUsed
 */
export declare const standardizeTrace: (trace: SyncTrace, request: Extract<RequestParameters, {
    method: "debug_traceBlockByNumber" | "debug_traceBlockByHash";
}>) => SyncTrace;
/**
 * Validate required transaction receipt properties and set non-required properties.
 *
 * Required properties:
 * - blockHash
 * - blockNumber
 * - transactionHash
 * - transactionIndex
 * - from
 * - to
 * - status
 *
 * Non-required properties:
 * - logs
 * - logsBloom
 * - gasUsed
 * - cumulativeGasUsed
 * - effectiveGasPrice
 * - root
 * - type
 */
export declare const standardizeTransactionReceipts: (receipts: SyncTransactionReceipt[], request: Extract<RequestParameters, {
    method: "eth_getBlockReceipts" | "eth_getTransactionReceipt";
}>) => SyncTransactionReceipt[];
//# sourceMappingURL=actions.d.ts.map