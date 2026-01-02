import { type AbiParameter, type AbiParameterToPrimitiveType, type DecodeAbiParametersReturnType, type Hex } from "viem";
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
export declare function decodeAbiParameters<const params extends readonly AbiParameter[]>(params: params, data: Hex, { formatAddress, out, }?: {
    formatAddress?: (address: Hex) => Hex;
    out?: DecodeAbiParametersReturnType<params>;
}): DecodeAbiParametersReturnType<params>;
/**
 * Decode a single abi parameter.
 *
 * @param param - The abi parameter to decode.
 * @param data - The data to decode.
 * @param formatAddress - An optional function to format addresses.
 *
 * @see https://github.com/wevm/viem/blob/38525bf1d55ec3fe0569e47700c7f9e70d3c971c/src/utils/abi/decodeAbiParameters.ts
 */
export declare function decodeAbiParameter<const param extends AbiParameter>(param: param, data: Hex, { formatAddress, }?: {
    formatAddress?: (address: Hex) => Hex;
}): AbiParameterToPrimitiveType<param>;
//# sourceMappingURL=decodeAbiParameters.d.ts.map