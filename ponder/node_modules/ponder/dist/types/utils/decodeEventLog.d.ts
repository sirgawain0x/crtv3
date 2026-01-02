import { type AbiEvent, type Hex } from "viem";
/**
 * Decode an event log.
 *
 * @see https://github.com/wevm/viem/blob/main/src/utils/abi/decodeEventLog.ts#L99
 */
export declare function decodeEventLog({ abiItem, topics, data, }: {
    abiItem: AbiEvent;
    topics: [signature: Hex, ...args: Hex[]] | [];
    data: Hex;
}): any;
//# sourceMappingURL=decodeEventLog.d.ts.map