import { orderObject } from '../utils/order.js';
import { getCacheKey } from "./utils.js";
export const getProfilePatternKey = (pattern) => {
    return JSON.stringify(orderObject(pattern), (_, value) => {
        if (typeof value === "bigint") {
            return value.toString();
        }
        return value;
    });
};
const eq = (target, value) => {
    if (target === value)
        return true;
    if (target && value && target.toString() === value.toString())
        return true;
    return false;
};
const delimiters = ["-", "_", ":", "#", "$"];
export const recordProfilePattern = (event, table, key, hints, cache) => {
    globalThis.DISABLE_EVENT_PROXY = true;
    for (const hint of hints) {
        if (getCacheKey(table, key, cache) ===
            getCacheKey(table, recoverProfilePattern(hint, event), cache)) {
            globalThis.DISABLE_EVENT_PROXY = false;
            return hint;
        }
    }
    const result = {};
    for (const [js] of cache.get(table)) {
        // @ts-ignore
        const value = key[js];
        const pattern = matchEventParameters(event, value);
        if (pattern === undefined) {
            globalThis.DISABLE_EVENT_PROXY = false;
            return undefined;
        }
        result[js] = pattern;
    }
    globalThis.DISABLE_EVENT_PROXY = false;
    return result;
};
const matchEventParameters = (event, value) => {
    if (eq(event.chain.id, value)) {
        return { type: "derived", value: ["chainId"] };
    }
    if (eq(event.event.id, value)) {
        return { type: "derived", value: ["id"] };
    }
    switch (event.type) {
        case "block": {
            if (eq(event.event.block.hash, value)) {
                return { type: "derived", value: ["block", "hash"] };
            }
            if (eq(event.event.block.number, value)) {
                return { type: "derived", value: ["block", "number"] };
            }
            if (eq(event.event.block.timestamp, value)) {
                return { type: "derived", value: ["block", "timestamp"] };
            }
            if (eq(event.event.block.timestamp / 60n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 60n,
                };
            }
            if (eq(event.event.block.timestamp / 3600n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 3600n,
                };
            }
            if (eq(event.event.block.timestamp / 86400n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 86400n,
                };
            }
            if (event.event.block.miner && eq(event.event.block.miner, value)) {
                return { type: "derived", value: ["block", "miner"] };
            }
            break;
        }
        case "transaction": {
            if (eq(event.event.block.hash, value)) {
                return { type: "derived", value: ["block", "hash"] };
            }
            if (eq(event.event.block.number, value)) {
                return { type: "derived", value: ["block", "number"] };
            }
            if (eq(event.event.block.timestamp, value)) {
                return { type: "derived", value: ["block", "timestamp"] };
            }
            if (eq(event.event.block.timestamp / 60n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 60n,
                };
            }
            if (eq(event.event.block.timestamp / 3600n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 3600n,
                };
            }
            if (eq(event.event.block.timestamp / 86400n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 86400n,
                };
            }
            if (event.event.block.miner && eq(event.event.block.miner, value)) {
                return { type: "derived", value: ["block", "miner"] };
            }
            if (eq(event.event.transaction.hash, value)) {
                return { type: "derived", value: ["transaction", "hash"] };
            }
            if (eq(event.event.transaction.from, value)) {
                return { type: "derived", value: ["transaction", "from"] };
            }
            if (event.event.transaction.to && eq(event.event.transaction.to, value)) {
                return { type: "derived", value: ["transaction", "to"] };
            }
            if (eq(event.event.transaction.transactionIndex, value)) {
                return { type: "derived", value: ["transaction", "transactionIndex"] };
            }
            if (event.event.transactionReceipt?.contractAddress &&
                eq(event.event.transactionReceipt.contractAddress, value)) {
                return {
                    type: "derived",
                    value: ["transactionReceipt", "contractAddress"],
                };
            }
            break;
        }
        case "log": {
            // Note: explicitly skip profiling args if they are an array
            if (event.event.args !== undefined &&
                Array.isArray(event.event.args) === false) {
                for (const argKey of Object.keys(event.event.args)) {
                    const argValue = event.event.args[argKey];
                    if (typeof argValue !== "object" && eq(argValue, value)) {
                        return { type: "derived", value: ["args", argKey] };
                    }
                }
            }
            if (eq(event.event.log.address, value)) {
                return { type: "derived", value: ["log", "address"] };
            }
            if (eq(event.event.log.logIndex, value)) {
                return { type: "derived", value: ["log", "logIndex"] };
            }
            if (eq(event.event.block.hash, value)) {
                return { type: "derived", value: ["block", "hash"] };
            }
            if (eq(event.event.block.number, value)) {
                return { type: "derived", value: ["block", "number"] };
            }
            if (eq(event.event.block.timestamp, value)) {
                return { type: "derived", value: ["block", "timestamp"] };
            }
            if (eq(event.event.block.timestamp / 60n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 60n,
                };
            }
            if (eq(event.event.block.timestamp / 3600n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 3600n,
                };
            }
            if (eq(event.event.block.timestamp / 86400n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 86400n,
                };
            }
            if (event.event.block.miner && eq(event.event.block.miner, value)) {
                return { type: "derived", value: ["block", "miner"] };
            }
            if (eq(event.event.transaction.hash, value)) {
                return { type: "derived", value: ["transaction", "hash"] };
            }
            if (eq(event.event.transaction.from, value)) {
                return { type: "derived", value: ["transaction", "from"] };
            }
            if (event.event.transaction.to && eq(event.event.transaction.to, value)) {
                return { type: "derived", value: ["transaction", "to"] };
            }
            if (eq(event.event.transaction.transactionIndex, value)) {
                return { type: "derived", value: ["transaction", "transactionIndex"] };
            }
            if (event.event.transactionReceipt?.contractAddress &&
                eq(event.event.transactionReceipt.contractAddress, value)) {
                return {
                    type: "derived",
                    value: ["transactionReceipt", "contractAddress"],
                };
            }
            break;
        }
        case "trace": {
            // Note: explicitly skip profiling args if they are an array
            if (event.event.args !== undefined &&
                Array.isArray(event.event.args) === false) {
                for (const argKey of Object.keys(event.event.args)) {
                    const argValue = event.event.args[argKey];
                    if (typeof argValue !== "object" && eq(argValue, value)) {
                        return { type: "derived", value: ["args", argKey] };
                    }
                }
            }
            // Note: explicitly skip profiling result if it is an array
            if (event.event.result !== undefined &&
                Array.isArray(event.event.result) === false) {
                for (const argKey of Object.keys(event.event.result)) {
                    const argValue = event.event.result[argKey];
                    if (typeof argValue !== "object" && eq(argValue, value)) {
                        return { type: "derived", value: ["result", argKey] };
                    }
                }
            }
            if (eq(event.event.trace.from, value)) {
                return { type: "derived", value: ["trace", "from"] };
            }
            if (event.event.trace.to && eq(event.event.trace.to, value)) {
                return { type: "derived", value: ["trace", "to"] };
            }
            if (eq(event.event.block.hash, value)) {
                return { type: "derived", value: ["block", "hash"] };
            }
            if (eq(event.event.block.number, value)) {
                return { type: "derived", value: ["block", "number"] };
            }
            if (eq(event.event.block.timestamp, value)) {
                return { type: "derived", value: ["block", "timestamp"] };
            }
            if (eq(event.event.block.timestamp / 60n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 60n,
                };
            }
            if (eq(event.event.block.timestamp / 3600n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 3600n,
                };
            }
            if (eq(event.event.block.timestamp / 86400n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 86400n,
                };
            }
            if (event.event.block.miner && eq(event.event.block.miner, value)) {
                return { type: "derived", value: ["block", "miner"] };
            }
            if (eq(event.event.transaction.hash, value)) {
                return { type: "derived", value: ["transaction", "hash"] };
            }
            if (eq(event.event.transaction.from, value)) {
                return { type: "derived", value: ["transaction", "from"] };
            }
            if (event.event.transaction.to && eq(event.event.transaction.to, value)) {
                return { type: "derived", value: ["transaction", "to"] };
            }
            if (eq(event.event.transaction.transactionIndex, value)) {
                return { type: "derived", value: ["transaction", "transactionIndex"] };
            }
            if (event.event.transactionReceipt?.contractAddress &&
                eq(event.event.transactionReceipt.contractAddress, value)) {
                return {
                    type: "derived",
                    value: ["transactionReceipt", "contractAddress"],
                };
            }
            break;
        }
        case "transfer": {
            if (eq(event.event.transfer.from, value)) {
                return { type: "derived", value: ["transfer", "from"] };
            }
            if (eq(event.event.transfer.to, value)) {
                return { type: "derived", value: ["transfer", "to"] };
            }
            if (eq(event.event.trace.from, value)) {
                return { type: "derived", value: ["trace", "from"] };
            }
            if (event.event.trace.to && eq(event.event.trace.to, value)) {
                return { type: "derived", value: ["trace", "to"] };
            }
            if (eq(event.event.block.hash, value)) {
                return { type: "derived", value: ["block", "hash"] };
            }
            if (eq(event.event.block.number, value)) {
                return { type: "derived", value: ["block", "number"] };
            }
            if (eq(event.event.block.timestamp, value)) {
                return { type: "derived", value: ["block", "timestamp"] };
            }
            if (eq(event.event.block.timestamp / 60n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 60n,
                };
            }
            if (eq(event.event.block.timestamp / 3600n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 3600n,
                };
            }
            if (eq(event.event.block.timestamp / 86400n, value)) {
                return {
                    type: "derived",
                    value: ["block", "timestamp"],
                    fn: (value) => value / 86400n,
                };
            }
            if (event.event.block.miner && eq(event.event.block.miner, value)) {
                return { type: "derived", value: ["block", "miner"] };
            }
            if (eq(event.event.transaction.hash, value)) {
                return { type: "derived", value: ["transaction", "hash"] };
            }
            if (eq(event.event.transaction.from, value)) {
                return { type: "derived", value: ["transaction", "from"] };
            }
            if (event.event.transaction.to && eq(event.event.transaction.to, value)) {
                return { type: "derived", value: ["transaction", "to"] };
            }
            if (eq(event.event.transaction.transactionIndex, value)) {
                return { type: "derived", value: ["transaction", "transactionIndex"] };
            }
            if (event.event.transactionReceipt?.contractAddress &&
                eq(event.event.transactionReceipt.contractAddress, value)) {
                return {
                    type: "derived",
                    value: ["transactionReceipt", "contractAddress"],
                };
            }
            break;
        }
    }
    if (typeof value === "string") {
        del: for (const delimiter of delimiters) {
            const subValues = value.split(delimiter);
            if (subValues.length > 1) {
                const result = {
                    type: "delimeter",
                    values: [],
                    delimiter,
                };
                for (const subValue of subValues) {
                    const match = matchEventParameters(event, subValue);
                    if (match?.type === "derived") {
                        result.values.push(match);
                        continue;
                    }
                    continue del;
                }
                return result;
            }
        }
    }
    return undefined;
};
export const recoverProfilePattern = (pattern, event) => {
    const result = {};
    for (const [key, _pattern] of Object.entries(pattern)) {
        if (_pattern.type === "derived") {
            const { value, fn } = _pattern;
            if (value[0] === "chainId") {
                result[key] = event.chain.id;
            }
            else {
                let _result = event.event;
                for (const prop of value) {
                    // @ts-ignore
                    _result = _result[prop];
                }
                if (fn) {
                    _result = fn(_result);
                }
                result[key] = _result;
            }
        }
        else {
            const { values, delimiter } = _pattern;
            result[key] = values
                .map(({ value, fn }) => {
                if (value[0] === "chainId") {
                    return event.chain.id;
                }
                else {
                    let _result = event.event;
                    for (const prop of value) {
                        // @ts-ignore
                        _result = _result[prop];
                    }
                    if (fn) {
                        _result = fn(_result);
                    }
                    return _result;
                }
            })
                .join(delimiter);
        }
    }
    return result;
};
//# sourceMappingURL=profile.js.map