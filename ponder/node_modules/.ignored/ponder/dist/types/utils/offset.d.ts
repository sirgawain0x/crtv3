import type { AbiParameter } from "abitype";
export declare function getBytesConsumedByParam(param: AbiParameter): number;
export type TupleAbiParameter = AbiParameter & {
    type: "tuple";
    components: readonly AbiParameter[];
};
export declare function getNestedParamOffset(param: TupleAbiParameter, names: string[]): number;
//# sourceMappingURL=offset.d.ts.map