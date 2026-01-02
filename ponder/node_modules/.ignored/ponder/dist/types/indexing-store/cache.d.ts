import type { QB } from '../database/queryBuilder.js';
import type { Common } from '../internal/common.js';
import type { CrashRecoveryCheckpoint, Event, SchemaBuild } from '../internal/types.js';
import { type Table } from "drizzle-orm";
export type IndexingCache = {
    /**
     * Returns true if the cache has an entry for `table` with `key`.
     */
    has: (params: {
        table: Table;
        key: object;
    }) => boolean;
    /**
     * Returns the entry for `table` with `key`.
     */
    get: (params: {
        table: Table;
        key: object;
    }) => Row | null | Promise<Row | null>;
    /**
     * Sets the entry for `table` with `key` to `row`.
     */
    set: (params: {
        table: Table;
        key: object;
        row: Row;
        isUpdate: boolean;
    }) => Row;
    /**
     * Deletes the entry for `table` with `key`.
     */
    delete: (params: {
        table: Table;
        key: object;
    }) => boolean | Promise<boolean>;
    /**
     * Writes all temporary data to the database.
     *
     * @param params.tableNames - If provided, only flush the tables in the set.
     */
    flush: (params?: {
        tableNames?: Set<string>;
    }) => Promise<void>;
    /**
     * Predict and load rows that will be accessed in the next event batch.
     */
    prefetch: (params: {
        events: Event[];
    }) => Promise<void>;
    /**
     * Marks the cache as incomplete.
     */
    invalidate: () => void;
    /**
     * Deletes all entries from the cache.
     */
    clear: () => void;
    event: Event | undefined;
    qb: QB;
};
/**
 * Database row.
 *
 * @example
 * {
 *   "owner": "0x123",
 *   "spender": "0x456",
 *   "amount": 100n,
 * }
 */
export type Row = {
    [key: string]: unknown;
};
/**
 * Recorded database access pattern.
 *
 * @example
 * {
 *   "owner": ["args", "from"],
 *   "spender": ["log", "address"],
 * }
 */
export type ProfilePattern = {
    [key: string]: {
        type: "derived";
        value: string[];
        fn?: (value: unknown) => unknown;
    } | {
        type: "delimeter";
        values: {
            value: string[];
            fn?: (value: unknown) => unknown;
        }[];
        delimiter: string;
    };
};
export declare const getCopyText: (table: Table, rows: Row[]) => string;
export declare const getCopyHelper: (qb: QB, chainId?: number) => (table: Table, text: string, includeSchema?: boolean) => Promise<void>;
export declare const recoverBatchError: <T>(values: T[], callback: (values: T[]) => Promise<unknown>) => Promise<{
    status: "success";
} | {
    status: "error";
    error: Error;
    value: T;
}>;
export declare const createIndexingCache: ({ common, schemaBuild: { schema }, crashRecoveryCheckpoint, eventCount, chainId, }: {
    common: Common;
    schemaBuild: Pick<SchemaBuild, "schema">;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    eventCount: {
        [eventName: string]: number;
    };
    chainId?: number | undefined;
}) => IndexingCache;
//# sourceMappingURL=cache.d.ts.map