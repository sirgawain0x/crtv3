import { InvalidHexBooleanError, } from "viem";
import { AbiDecodingDataSizeTooSmallError, AbiDecodingZeroDataError, InvalidAbiDecodingTypeError, checksumAddress, hexToBigInt, hexToNumber, hexToString, } from "viem";
const TRUE_BOOL = "0x0000000000000000000000000000000000000000000000000000000000000001";
const FALSE_BOOL = "0x0000000000000000000000000000000000000000000000000000000000000000";
const FIXED_ARRAY_REGEX = /^(.*)\[(\d+)\]$/;
const DYNAMIC_ARRAY_REGEX = /^(.*)\[\]$/;
const cursor = { index: 2, offset: 2, length: 2, readCount: 0, readLimit: 0 };
function readWord(data) {
    if (cursor.readCount > cursor.readLimit) {
        throw new Error("Recursive read limit exceeded.");
    }
    cursor.readCount++;
    if (data.length - cursor.index < 64) {
        throw new Error("Invalid data length.");
    }
    return `0x${data.slice(cursor.index, cursor.index + 64)}`;
}
/**
 * Decode a list of abi parameters.
 *
 * @param params - The abi parameters to decode.
 * @param data - The data to decode.
 * @param formatAddress - An optional function to format addresses.
 * @param out - An optional array to store the decoded parameters.
 *
 * @see https://github.com/wevm/viem/blob/38525bf1d55ec3fe0569e47700c7f9e70d3c971c/src/utils/abi/decodeAbiParameters.ts
 */
export function decodeAbiParameters(params, data, { formatAddress = checksumAddress, out = [], } = {
    formatAddress: checksumAddress,
    out: [],
}) {
    if (data.length <= 2 && params.length > 0) {
        throw new AbiDecodingZeroDataError();
    }
    if (data.length > 2 && data.length < 66) {
        throw new AbiDecodingDataSizeTooSmallError({
            data,
            params: params,
            size: (data.length - 2) / 2,
        });
    }
    cursor.index = 2;
    cursor.offset = 2;
    cursor.length = data.length;
    cursor.readCount = 0;
    cursor.readLimit = Math.floor(data.length / 64) + 8192;
    for (const param of params) {
        if (data.length - cursor.index < 64) {
            throw new Error("Invalid data length.");
        }
        out.push(_decodeAbiParameter(param, data, formatAddress));
    }
    return out;
}
function _decodeAbiParameter(param, data, formatAddress = checksumAddress) {
    if (isAbiParameterFixedArray(param)) {
        const _type = param.type;
        const [_, type, length] = param.type.match(FIXED_ARRAY_REGEX);
        param.type = type;
        if (length === "0") {
            throw new Error("Invalid data length.");
        }
        if (isAbiParameterDeeplyStatic(param) === false) {
            const _offset = cursor.offset;
            const _index = cursor.index;
            const offset = readWord(data);
            cursor.index = cursor.offset + hexToNumber(offset) * 2;
            cursor.offset += hexToNumber(offset) * 2;
            const value = [];
            for (let i = 0; i < Number.parseInt(length, 10); ++i) {
                cursor.index = cursor.offset + i * 64;
                value.push(_decodeAbiParameter(param, data, formatAddress));
            }
            cursor.offset = _offset;
            cursor.index = _index + 64;
            param.type = _type;
            return value;
        }
        const value = [];
        for (let i = 0; i < Number.parseInt(length, 10); ++i) {
            if (data.length - cursor.index < 64) {
                throw new Error("Invalid data length.");
            }
            value.push(_decodeAbiParameter(param, data, formatAddress));
        }
        param.type = _type;
        return value;
    }
    if (isAbiParameterDynamicArray(param)) {
        const _offset = cursor.offset;
        const _index = cursor.index;
        const offset = readWord(data);
        cursor.index = cursor.offset + hexToNumber(offset) * 2;
        cursor.offset += hexToNumber(offset) * 2 + 64;
        const length = readWord(data);
        cursor.index += 64;
        const _type = param.type;
        const [_, type] = param.type.match(DYNAMIC_ARRAY_REGEX);
        param.type = type;
        const deeplyStatic = isAbiParameterDeeplyStatic(param);
        const value = [];
        for (let i = 0; i < hexToNumber(length); ++i) {
            if (deeplyStatic === false) {
                cursor.index = cursor.offset + i * 64;
            }
            if (data.length - cursor.index < 64) {
                throw new Error("Invalid data length.");
            }
            value.push(_decodeAbiParameter(param, data, formatAddress));
        }
        cursor.offset = _offset;
        cursor.index = _index + 64;
        param.type = _type;
        return value;
    }
    if (param.type === "tuple") {
        const components = param.components;
        const hasUnnamedChild = components.length === 0 ||
            components.some((component) => component.name === undefined);
        const value = hasUnnamedChild ? [] : {};
        if (isAbiParameterDeeplyStatic(param)) {
            for (let i = 0; i < components.length; ++i) {
                const component = components[i];
                const _value = _decodeAbiParameter(component, data, formatAddress);
                if (hasUnnamedChild) {
                    value.push(_value);
                }
                else {
                    value[component.name] = _value;
                }
            }
            return value;
        }
        const _offset = cursor.offset;
        const _index = cursor.index;
        const offset = readWord(data);
        cursor.offset += hexToNumber(offset) * 2;
        cursor.index = cursor.offset;
        for (let i = 0; i < components.length; ++i) {
            const component = components[i];
            const _value = _decodeAbiParameter(component, data, formatAddress);
            if (hasUnnamedChild) {
                value.push(_value);
            }
            else {
                value[component.name] = _value;
            }
        }
        cursor.offset = _offset;
        cursor.index = _index + 64;
        return value;
    }
    if (param.type === "address") {
        if (data.length - cursor.index < 64) {
            throw new Error("Invalid data length.");
        }
        const address = `0x${data.slice(cursor.index + 24, cursor.index + 64)}`;
        cursor.index += 64;
        return formatAddress(address);
    }
    if (param.type.startsWith("uint") || param.type.startsWith("int")) {
        const signed = param.type.startsWith("int");
        const size = Number.parseInt(param.type.split("int")[1] || "256", 10);
        const value = readWord(data);
        cursor.index += 64;
        return size > 48
            ? hexToBigInt(value, { signed })
            : hexToNumber(value, { signed });
    }
    if (param.type.startsWith("bytes") && param.type.length > 5) {
        const [_, size] = param.type.split("bytes");
        if (data.length - cursor.index < Number.parseInt(size, 10) * 2) {
            throw new Error("Invalid data length.");
        }
        const value = `0x${data.slice(cursor.index, cursor.index + Number.parseInt(size, 10) * 2)}`;
        cursor.index += 64;
        return value;
    }
    if (param.type === "bool") {
        const value = readWord(data);
        cursor.index += 64;
        if (value !== TRUE_BOOL && value !== FALSE_BOOL) {
            throw new InvalidHexBooleanError(value);
        }
        return value === TRUE_BOOL;
    }
    if (param.type === "string") {
        const _index = cursor.index;
        const offset = readWord(data);
        cursor.index = cursor.offset + hexToNumber(offset) * 2;
        const length = readWord(data);
        cursor.index += 64;
        if (hexToNumber(length) === 0) {
            cursor.index = _index + 64;
            return "";
        }
        if (data.length - cursor.index < hexToNumber(length) * 2) {
            throw new Error("Invalid data length.");
        }
        const value = `0x${data.slice(cursor.index, cursor.index + hexToNumber(length) * 2)}`;
        cursor.index = _index + 64;
        return hexToString(value);
    }
    if (param.type === "bytes") {
        const index = cursor.index;
        const offset = readWord(data);
        cursor.index = cursor.offset + hexToNumber(offset) * 2;
        const length = readWord(data);
        cursor.index += 64;
        if (hexToNumber(length) === 0) {
            cursor.index = index + 64;
            return "0x";
        }
        if (data.length - cursor.index < hexToNumber(length) * 2) {
            throw new Error("Invalid data length.");
        }
        const value = `0x${data.slice(cursor.index, cursor.index + hexToNumber(length) * 2)}`;
        cursor.index = index + 64;
        return value;
    }
    throw new InvalidAbiDecodingTypeError(param.type, {
        docsPath: "/docs/contract/decodeAbiParameters",
    });
}
/**
 * Decode a single abi parameter.
 *
 * @param param - The abi parameter to decode.
 * @param data - The data to decode.
 * @param formatAddress - An optional function to format addresses.
 *
 * @see https://github.com/wevm/viem/blob/38525bf1d55ec3fe0569e47700c7f9e70d3c971c/src/utils/abi/decodeAbiParameters.ts
 */
export function decodeAbiParameter(param, data, { formatAddress = checksumAddress, } = {
    formatAddress: checksumAddress,
}) {
    if (data.length <= 2) {
        throw new AbiDecodingZeroDataError();
    }
    if (data.length !== 66) {
        throw new Error(`Invalid data length. Expected 66 bytes, got ${data.length}`);
    }
    if (param.type === "address") {
        const address = `0x${data.slice(2 + 12 * 2)}`;
        return formatAddress(address);
    }
    if (param.type.startsWith("uint") || param.type.startsWith("int")) {
        const signed = param.type.startsWith("int");
        const size = Number.parseInt(param.type.split("int")[1] || "256", 10);
        return (size > 48 ? hexToBigInt(data, { signed }) : hexToNumber(data, { signed }));
    }
    if (param.type.startsWith("bytes") && param.type.length > 5) {
        const [_, size] = param.type.split("bytes");
        return data.slice(0, 2 + Number.parseInt(size, 10) * 2);
    }
    if (param.type === "bool") {
        return (data === TRUE_BOOL);
    }
    throw new InvalidAbiDecodingTypeError(param.type, {
        docsPath: "/docs/contract/decodeAbiParameters",
    });
}
function isAbiParameterFixedArray(param) {
    return FIXED_ARRAY_REGEX.test(param.type);
}
function isAbiParameterDynamicArray(param) {
    return DYNAMIC_ARRAY_REGEX.test(param.type);
}
function isAbiParameterDeeplyStatic(param) {
    const { type } = param;
    if (type === "string")
        return false;
    if (type === "bytes")
        return false;
    if (type.endsWith("[]"))
        return false;
    if (type === "tuple") {
        return param.components.every(isAbiParameterDeeplyStatic);
    }
    if (isAbiParameterFixedArray(param)) {
        const _type = param.type;
        const [_, type] = param.type.match(FIXED_ARRAY_REGEX);
        param.type = type;
        const result = isAbiParameterDeeplyStatic(param);
        param.type = _type;
        return result;
    }
    return true;
}
//# sourceMappingURL=decodeAbiParameters.js.map