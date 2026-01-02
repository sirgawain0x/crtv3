import { type Abi, type AbiEvent, type AbiFunction } from "abitype";
import { type Hex } from "viem";
import type { Config } from "../config/index.js";
/**
 * Fix issue with Array.isArray not checking readonly arrays
 * {@link https://github.com/microsoft/TypeScript/issues/17002}
 */
declare global {
    interface ArrayConstructor {
        isArray(arg: ReadonlyArray<any> | any): arg is ReadonlyArray<any>;
    }
}
export declare const toSafeName: ({ abi, item, }: {
    abi: Abi;
    item: AbiEvent | AbiFunction;
}) => string;
export declare function buildTopics(abi: Abi, filter: NonNullable<Config["contracts"][string]["filter"]>): {
    topic0: Hex;
    topic1: Hex | Hex[] | null;
    topic2: Hex | Hex[] | null;
    topic3: Hex | Hex[] | null;
}[];
//# sourceMappingURL=abi.d.ts.map