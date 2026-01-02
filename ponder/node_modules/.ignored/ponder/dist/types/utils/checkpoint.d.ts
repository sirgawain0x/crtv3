import type { LightBlock, SyncBlock } from '../internal/types.js';
export type Checkpoint = {
    blockTimestamp: bigint;
    chainId: bigint;
    blockNumber: bigint;
    transactionIndex: bigint;
    eventType: number;
    eventIndex: bigint;
};
export declare const EVENT_TYPES: {
    readonly transactions: 2;
    readonly blocks: 5;
    readonly logs: 5;
    readonly traces: 7;
};
export declare const encodeCheckpoint: (checkpoint: Checkpoint | {
    blockTimestamp: number | bigint;
    chainId: number | bigint;
    blockNumber: number | bigint;
    transactionIndex: number | bigint;
    eventType: number | bigint;
    eventIndex: number | bigint;
}) => string;
export declare const decodeCheckpoint: (checkpoint: string) => Checkpoint;
export declare const ZERO_CHECKPOINT: Checkpoint;
export declare const MAX_CHECKPOINT: Checkpoint;
export declare const ZERO_CHECKPOINT_STRING: string;
export declare const MAX_CHECKPOINT_STRING: string;
/**
/**
 * Returns true if two checkpoints are equal.
 */
export declare const isCheckpointEqual: (a: Checkpoint, b: Checkpoint) => boolean;
/**
 * Returns true if checkpoint a is greater than checkpoint b.
 * Returns false if the checkpoints are equal.
 */
export declare const isCheckpointGreaterThan: (a: Checkpoint, b: Checkpoint) => boolean;
/**
 * Returns true if checkpoint a is greater than or equal to checkpoint b.|
 */
export declare const isCheckpointGreaterThanOrEqualTo: (a: Checkpoint, b: Checkpoint) => boolean;
export declare const checkpointMax: (...checkpoints: Checkpoint[]) => Checkpoint;
export declare const checkpointMin: (...checkpoints: Checkpoint[]) => Checkpoint;
export declare const LATEST: string;
/** Compute the minimum checkpoint, filtering out undefined. */
export declare const min: (...checkpoints: (string | undefined)[]) => string;
/** Compute the maximum checkpoint, filtering out undefined. */
export declare const max: (...checkpoints: (string | undefined)[]) => string | undefined;
/** Convert `block` to a `Checkpoint`. */
export declare const blockToCheckpoint: (block: LightBlock | SyncBlock, chainId: number, rounding: "up" | "down") => Checkpoint;
//# sourceMappingURL=checkpoint.d.ts.map