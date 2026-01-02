import type { Prettify } from '../types/utils.js';
import { type PGliteOptions as Options, PGlite } from "@electric-sql/pglite";
import { type DatabaseConnection, type Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, type TransactionSettings } from "kysely";
export type PGliteOptions = Prettify<Options & {
    dataDir: string;
}>;
export declare function createPglite(options: PGliteOptions): PGlite;
export declare function createPgliteKyselyDialect(instance: PGlite): {
    createAdapter: () => PostgresAdapter;
    createDriver: () => PGliteDriver;
    createIntrospector: (db: Kysely<any>) => PostgresIntrospector;
    createQueryCompiler: () => PostgresQueryCompiler;
};
export declare class PGliteDriver {
    #private;
    constructor(client: PGlite);
    acquireConnection(): Promise<DatabaseConnection>;
    beginTransaction(connection: DatabaseConnection, _settings: TransactionSettings): Promise<void>;
    commitTransaction(connection: DatabaseConnection): Promise<void>;
    rollbackTransaction(connection: DatabaseConnection): Promise<void>;
    destroy(): Promise<void>;
    init(): Promise<void>;
    releaseConnection(_connection: DatabaseConnection): Promise<void>;
}
//# sourceMappingURL=pglite.d.ts.map