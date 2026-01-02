import type { Common } from '../internal/common.js';
import type { Logger } from '../internal/logger.js';
import type { Schema } from '../internal/types.js';
import type { Drizzle } from '../types/db.js';
import { PGlite } from "@electric-sql/pglite";
import type { PgTransactionConfig } from "drizzle-orm/pg-core";
import type pg from "pg";
type InnerQB<TSchema extends Schema = Schema, TClient extends PGlite | pg.Pool | pg.PoolClient = PGlite | pg.Pool | pg.PoolClient> = Omit<Drizzle<TSchema>, "transaction"> & TransactionQB<TSchema, TClient>;
type TransactionQB<TSchema extends Schema = Schema, TClient extends PGlite | pg.Pool | pg.PoolClient = PGlite | pg.Pool | pg.PoolClient> = {
    /**
     * Transaction with retries, logging, metrics, and error parsing.
     */
    transaction<T>(transaction: (tx: QB<TSchema, TClient>) => Promise<T>, config?: PgTransactionConfig, context?: {
        logger?: Logger;
    }): Promise<T>;
    transaction<T>({ label }: {
        label: string;
    }, transaction: (tx: QB<TSchema, TClient>) => Promise<T>, config?: PgTransactionConfig, context?: {
        logger?: Logger;
    }): Promise<T>;
};
/**
 * Query builder with built-in retry logic, logging, and metrics.
 */
export type QB<TSchema extends Schema = Schema, TClient extends PGlite | pg.Pool | pg.PoolClient = PGlite | pg.Pool | pg.PoolClient> = TransactionQB<TSchema, TClient> & {
    raw: Drizzle<TSchema>;
    /**
     * Query with retries, logging, metrics, and error parsing.
     */
    wrap<T>(query: (db: InnerQB<TSchema, TClient>) => T, context?: {
        logger?: Logger;
    }): T;
    wrap<T>({ label }: {
        label: string;
    }, query: (db: InnerQB<TSchema, TClient>) => T, context?: {
        logger?: Logger;
    }): T;
} & ({
    $dialect: "pglite";
    $client: PGlite;
} | {
    $dialect: "postgres";
    $client: pg.Pool | pg.PoolClient;
});
export declare const parseDbError: (error: any) => Error;
/**
 * Create a query builder.
 *
 * @example
 * ```ts
 * const qb = createQB(drizzle(pool), { casing: "snake_case", common });
 * const result1 = await qb.wrap((db) => db.select().from(accounts));
 * const result2 = await qb.wrap({ label: "label" }, (db) => db.select().from(accounts));
 * ```
 */
export declare const createQB: <TSchema extends Schema = {
    [name: string]: never;
}, TClient extends pg.Pool | pg.PoolClient | PGlite = pg.Pool | pg.PoolClient | PGlite>(db: Drizzle<TSchema> & {
    $client: TClient;
}, { common, isAdmin }: {
    common: Common;
    isAdmin?: boolean | undefined;
}) => QB<TSchema, TClient>;
export {};
//# sourceMappingURL=queryBuilder.d.ts.map