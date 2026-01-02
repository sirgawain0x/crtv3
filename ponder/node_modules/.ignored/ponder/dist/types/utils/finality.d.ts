import type { Chain } from "viem";
/**
 * Returns the number of blocks that must pass before a block is considered final.
 * Note that a value of `0` indicates that blocks are considered final immediately.
 *
 * @param chain The chain to get the finality block count for.
 * @returns The finality block count.
 */
export declare function getFinalityBlockCount({ chain }: {
    chain: Chain | undefined;
}): number;
//# sourceMappingURL=finality.d.ts.map