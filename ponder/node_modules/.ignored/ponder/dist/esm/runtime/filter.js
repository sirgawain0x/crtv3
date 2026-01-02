import { toLowerCase } from '../utils/lowercase.js';
import { hexToNumber } from "viem";
/** Returns true if `address` is an address filter. */
export const isAddressFactory = (address) => {
    if (address === undefined ||
        address === null ||
        typeof address === "string") {
        return false;
    }
    return Array.isArray(address) ? isAddressFactory(address[0]) : true;
};
export const getChildAddress = ({ log, factory, }) => {
    if (factory.childAddressLocation.startsWith("offset")) {
        const childAddressOffset = Number(factory.childAddressLocation.substring(6));
        const start = 2 + 12 * 2 + childAddressOffset * 2;
        const length = 20 * 2;
        return `0x${log.data.substring(start, start + length)}`;
    }
    else {
        const start = 2 + 12 * 2;
        const length = 20 * 2;
        const topicIndex = factory.childAddressLocation === "topic1"
            ? 1
            : factory.childAddressLocation === "topic2"
                ? 2
                : 3;
        return `0x${log.topics[topicIndex].substring(start, start + length)}`;
    }
};
export const isAddressMatched = ({ address, blockNumber, childAddresses, }) => {
    if (address === undefined)
        return false;
    if (childAddresses.has(toLowerCase(address)) &&
        childAddresses.get(toLowerCase(address)) <= blockNumber) {
        return true;
    }
    return false;
};
const isValueMatched = (filterValue, eventValue) => {
    // match all
    if (filterValue === null || filterValue === undefined)
        return true;
    // missing value
    if (eventValue === undefined)
        return false;
    // array
    if (Array.isArray(filterValue) &&
        filterValue.some((v) => v === toLowerCase(eventValue))) {
        return true;
    }
    // single
    if (filterValue === toLowerCase(eventValue))
        return true;
    return false;
};
/**
 * Returns `true` if `log` matches `factory`
 */
export const isLogFactoryMatched = ({ factory, log, }) => {
    if (factory.address !== undefined) {
        const addresses = Array.isArray(factory.address)
            ? factory.address
            : [factory.address];
        if (addresses.every((address) => address !== toLowerCase(log.address))) {
            return false;
        }
    }
    if (log.topics.length === 0)
        return false;
    if (factory.eventSelector !== toLowerCase(log.topics[0]))
        return false;
    if (factory.fromBlock !== undefined &&
        (typeof log.blockNumber === "number"
            ? factory.fromBlock > log.blockNumber
            : factory.fromBlock > hexToNumber(log.blockNumber)))
        return false;
    if (factory.toBlock !== undefined &&
        (typeof log.blockNumber === "number"
            ? factory.toBlock < log.blockNumber
            : factory.toBlock < hexToNumber(log.blockNumber)))
        return false;
    return true;
};
/**
 * Returns `true` if `log` matches `filter`
 */
export const isLogFilterMatched = ({ filter, log, }) => {
    // Return `false` for out of range blocks
    if (Number(log.blockNumber) < (filter.fromBlock ?? 0) ||
        Number(log.blockNumber) > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    if (isValueMatched(filter.topic0, log.topics[0]) === false)
        return false;
    if (isValueMatched(filter.topic1, log.topics[1]) === false)
        return false;
    if (isValueMatched(filter.topic2, log.topics[2]) === false)
        return false;
    if (isValueMatched(filter.topic3, log.topics[3]) === false)
        return false;
    if (isAddressFactory(filter.address) === false &&
        isValueMatched(filter.address, log.address) === false) {
        return false;
    }
    return true;
};
/**
 * Returns `true` if `transaction` matches `filter`
 */
export const isTransactionFilterMatched = ({ filter, transaction, }) => {
    // Return `false` for out of range blocks
    if (Number(transaction.blockNumber) < (filter.fromBlock ?? 0) ||
        Number(transaction.blockNumber) >
            (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    if (isAddressFactory(filter.fromAddress) === false &&
        isValueMatched(filter.fromAddress, transaction.from) === false) {
        return false;
    }
    if (isAddressFactory(filter.toAddress) === false &&
        isValueMatched(filter.toAddress, transaction.to ?? undefined) === false) {
        return false;
    }
    // NOTE: `filter.includeReverted` is intentionally ignored
    return true;
};
/**
 * Returns `true` if `trace` matches `filter`
 */
export const isTraceFilterMatched = ({ filter, trace, block, }) => {
    // Return `false` for out of range blocks
    if (Number(block.number) < (filter.fromBlock ?? 0) ||
        Number(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    if (isAddressFactory(filter.fromAddress) === false &&
        isValueMatched(filter.fromAddress, trace.from) === false) {
        return false;
    }
    if (isAddressFactory(filter.toAddress) === false &&
        isValueMatched(filter.toAddress, trace.to ?? undefined) === false) {
        return false;
    }
    if (isValueMatched(filter.functionSelector, trace.input.slice(0, 10)) === false) {
        return false;
    }
    // NOTE: `filter.callType` and `filter.includeReverted` is intentionally ignored
    return true;
};
/**
 * Returns `true` if `trace` matches `filter`
 */
export const isTransferFilterMatched = ({ filter, trace, block, }) => {
    // Return `false` for out of range blocks
    if (Number(block.number) < (filter.fromBlock ?? 0) ||
        Number(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    if (trace.value === undefined ||
        trace.value === null ||
        BigInt(trace.value) === 0n) {
        return false;
    }
    if (isAddressFactory(filter.fromAddress) === false &&
        isValueMatched(filter.fromAddress, trace.from) === false) {
        return false;
    }
    if (isAddressFactory(filter.toAddress) === false &&
        isValueMatched(filter.toAddress, trace.to ?? undefined) === false) {
        return false;
    }
    // NOTE: `filter.includeReverted` is intentionally ignored
    return true;
};
/**
 * Returns `true` if `block` matches `filter`
 */
export const isBlockFilterMatched = ({ filter, block, }) => {
    // Return `false` for out of range blocks
    if (Number(block.number) < (filter.fromBlock ?? 0) ||
        Number(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    return (Number(block.number) - filter.offset) % filter.interval === 0;
};
export const getFilterFactories = (filter) => {
    const factories = [];
    switch (filter.type) {
        case "log":
            if (isAddressFactory(filter.address)) {
                factories.push(filter.address);
            }
            break;
        case "trace":
        case "transfer":
        case "transaction": {
            if (isAddressFactory(filter.fromAddress)) {
                factories.push(filter.fromAddress);
            }
            if (isAddressFactory(filter.toAddress)) {
                factories.push(filter.toAddress);
            }
            break;
        }
    }
    return factories;
};
export const getFilterFromBlock = (filter) => {
    const blocks = [filter.fromBlock ?? 0];
    switch (filter.type) {
        case "log":
            if (isAddressFactory(filter.address)) {
                blocks.push(filter.address.fromBlock ?? 0);
            }
            break;
        case "transaction":
        case "trace":
        case "transfer":
            if (isAddressFactory(filter.fromAddress)) {
                blocks.push(filter.fromAddress.fromBlock ?? 0);
            }
            if (isAddressFactory(filter.toAddress)) {
                blocks.push(filter.toAddress.fromBlock ?? 0);
            }
    }
    return Math.min(...blocks);
};
export const getFilterToBlock = (filter) => {
    const blocks = [filter.toBlock ?? Number.POSITIVE_INFINITY];
    // Note: factories cannot have toBlock > `filter.toBlock`
    switch (filter.type) {
        case "log":
            if (isAddressFactory(filter.address)) {
                blocks.push(filter.address.toBlock ?? Number.POSITIVE_INFINITY);
            }
            break;
        case "transaction":
        case "trace":
        case "transfer":
            if (isAddressFactory(filter.fromAddress)) {
                blocks.push(filter.fromAddress.toBlock ?? Number.POSITIVE_INFINITY);
            }
            if (isAddressFactory(filter.toAddress)) {
                blocks.push(filter.toAddress.toBlock ?? Number.POSITIVE_INFINITY);
            }
    }
    return Math.max(...blocks);
};
export const isBlockInFilter = (filter, blockNumber) => {
    // Return `false` for out of range blocks
    if (blockNumber < (filter.fromBlock ?? 0) ||
        blockNumber > (filter.toBlock ?? Number.POSITIVE_INFINITY)) {
        return false;
    }
    return true;
};
export const defaultBlockInclude = [
    "baseFeePerGas",
    "difficulty",
    "extraData",
    "gasLimit",
    "gasUsed",
    "hash",
    "logsBloom",
    "miner",
    "mixHash",
    "totalDifficulty",
    "nonce",
    "number",
    "parentHash",
    "receiptsRoot",
    "sha3Uncles",
    "size",
    "stateRoot",
    "timestamp",
    "transactionsRoot",
];
export const requiredBlockInclude = [
    "timestamp",
    "number",
    "hash",
];
export const defaultTransactionInclude = [
    "from",
    "gas",
    "hash",
    "input",
    "nonce",
    "r",
    "s",
    "to",
    "transactionIndex",
    "v",
    "value",
    "type",
    "gasPrice",
    "accessList",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
];
export const requiredTransactionInclude = [
    "transactionIndex",
    "from",
    "to",
    "hash",
    "type",
];
export const defaultTransactionReceiptInclude = [
    "contractAddress",
    "cumulativeGasUsed",
    "effectiveGasPrice",
    "from",
    "gasUsed",
    "logsBloom",
    "status",
    "to",
    "type",
];
export const requiredTransactionReceiptInclude = ["status", "from", "to"];
export const defaultTraceInclude = [
    "traceIndex",
    "type",
    "from",
    "to",
    "gas",
    "gasUsed",
    "input",
    "output",
    "error",
    "revertReason",
    "value",
    "subcalls",
];
export const requiredTraceInclude = [
    "traceIndex",
    "type",
    "from",
    "to",
    "input",
    "output",
    "error",
    "value",
];
export const defaultLogInclude = [
    "address",
    "data",
    "logIndex",
    "removed",
    "topics",
];
export const requiredLogInclude = defaultLogInclude;
export const defaultBlockFilterInclude = defaultBlockInclude.map((value) => `block.${value}`);
export const requiredBlockFilterInclude = requiredBlockInclude.map((value) => `block.${value}`);
export const defaultLogFilterInclude = [
    ...defaultLogInclude.map((value) => `log.${value}`),
    ...defaultTransactionInclude.map((value) => `transaction.${value}`),
    ...defaultBlockInclude.map((value) => `block.${value}`),
];
export const requiredLogFilterInclude = [
    ...requiredLogInclude.map((value) => `log.${value}`),
    ...requiredTransactionInclude.map((value) => `transaction.${value}`),
    ...requiredBlockInclude.map((value) => `block.${value}`),
];
export const defaultTransactionFilterInclude = [
    ...defaultTransactionInclude.map((value) => `transaction.${value}`),
    ...defaultTransactionReceiptInclude.map((value) => `transactionReceipt.${value}`),
    ...defaultBlockInclude.map((value) => `block.${value}`),
];
export const requiredTransactionFilterInclude = [
    ...requiredTransactionInclude.map((value) => `transaction.${value}`),
    ...requiredTransactionReceiptInclude.map((value) => `transactionReceipt.${value}`),
    ...requiredBlockInclude.map((value) => `block.${value}`),
];
export const defaultTraceFilterInclude = [
    ...defaultBlockInclude.map((value) => `block.${value}`),
    ...defaultTransactionInclude.map((value) => `transaction.${value}`),
    ...defaultTraceInclude.map((value) => `trace.${value}`),
];
export const requiredTraceFilterInclude = [
    ...requiredBlockInclude.map((value) => `block.${value}`),
    ...requiredTransactionInclude.map((value) => `transaction.${value}`),
    ...requiredTraceInclude.map((value) => `trace.${value}`),
];
export const defaultTransferFilterInclude = [
    ...defaultBlockInclude.map((value) => `block.${value}`),
    ...defaultTransactionInclude.map((value) => `transaction.${value}`),
    ...defaultTraceInclude.map((value) => `trace.${value}`),
];
export const requiredTransferFilterInclude = [
    ...requiredBlockInclude.map((value) => `block.${value}`),
    ...requiredTransactionInclude.map((value) => `transaction.${value}`),
    ...requiredTraceInclude.map((value) => `trace.${value}`),
];
export const unionFilterIncludeBlock = (filters) => {
    const includeBlock = new Set();
    for (const filter of filters) {
        for (const include of filter.include) {
            const [data, column] = include.split(".");
            if (data === "block") {
                includeBlock.add(column);
            }
        }
    }
    return Array.from(includeBlock);
};
export const unionFilterIncludeTransaction = (filters) => {
    const includeTransaction = new Set();
    for (const filter of filters) {
        for (const include of filter.include) {
            const [data, column] = include.split(".");
            if (data === "transaction") {
                includeTransaction.add(column);
            }
        }
    }
    return Array.from(includeTransaction);
};
export const unionFilterIncludeTransactionReceipt = (filters) => {
    const includeTransactionReceipt = new Set();
    for (const filter of filters) {
        for (const include of filter.include) {
            const [data, column] = include.split(".");
            if (data === "transactionReceipt") {
                includeTransactionReceipt.add(column);
            }
        }
    }
    return Array.from(includeTransactionReceipt);
};
export const unionFilterIncludeTrace = (filters) => {
    const includeTrace = new Set();
    for (const filter of filters) {
        for (const include of filter.include) {
            const [data, column] = include.split(".");
            if (data === "trace") {
                includeTrace.add(column);
            }
        }
    }
    return Array.from(includeTrace);
};
//# sourceMappingURL=filter.js.map