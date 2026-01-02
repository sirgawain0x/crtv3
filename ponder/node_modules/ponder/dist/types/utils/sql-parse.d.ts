import type { Node } from "@pgsql/types";
export declare const parseSQLQuery: (sql: string) => Promise<Node>;
/**
 * Validate a SQL query.
 *
 * @param sql - SQL query
 */
export declare const validateAllowableSQLQuery: (sql: string) => Promise<void>;
/**
 * Return `true` if the SQL query is readonly, else `false`.
 *
 * @param sql - SQL query
 */
export declare const isReadonlySQLQuery: (sql: string) => Promise<boolean>;
/**
 * Find all referenced relations in a SQL query.
 *
 * @param sql - SQL query
 */
export declare const getSQLQueryRelations: (sql: string) => Promise<Set<string>>;
//# sourceMappingURL=sql-parse.d.ts.map