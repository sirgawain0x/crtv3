import type { Schema } from '../internal/types.js';
import type { ReadonlyDrizzle } from '../types/db.js';
/**
 * Middleware for GraphQL with an interactive web view.
 *
 * - Docs: https://ponder.sh/docs/api-reference/ponder/api-endpoints#graphql
 *
 * @example
 * import { db } from "ponder:api";
 * import schema from "ponder:schema";
 * import { graphql } from '../index.js';
 * import { Hono } from "hono";
 *
 * const app = new Hono();
 *
 * app.use("/graphql", graphql({ db, schema }));
 *
 * export default app;
 *
 */
export declare const graphql: ({ schema }: {
    db: ReadonlyDrizzle<Schema>;
    schema: Schema;
}, { maxOperationTokens, maxOperationDepth, maxOperationAliases, }?: {
    maxOperationTokens?: number | undefined;
    maxOperationDepth?: number | undefined;
    maxOperationAliases?: number | undefined;
}) => import("hono").MiddlewareHandler<any, string, {}>;
//# sourceMappingURL=middleware.d.ts.map