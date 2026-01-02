import type { LogFilter, SyncBlock } from '../internal/types.js';
import { type Hex } from "viem";
export declare const zeroLogsBloom = "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
export declare const isInBloom: (_bloom: Hex, input: Hex) => boolean;
/**
 * Return true if `filter` is in `bloom`.
 *
 * A filter with an address of type `LogFactory` is matched
 * if the address filter is matched (new child contract) or the log
 * filter is matched (log on child contract).
 *
 * Note: False positives are possible.
 */
export declare function isFilterInBloom({ block, filter, }: {
    block: Pick<SyncBlock, "number" | "logsBloom">;
    filter: LogFilter;
}): boolean;
//# sourceMappingURL=bloom.d.ts.map