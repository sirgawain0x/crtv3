import type { Schema } from '../internal/types.js';
import type { ReadonlyDrizzle } from '../types/db.js';
/**
 * Middleware for `@ponder/client`.
 *
 * @param db - Drizzle database instance
 * @param schema - Ponder schema
 *
 * @example
 * ```ts
 * import { db } from "ponder:api";
 * import schema from "ponder:schema";
 * import { Hono } from "hono";
 * import { client } from "ponder";
 *
 * const app = new Hono();
 *
 * app.use("/sql/*", client({ db, schema }));
 *
 * export default app;
 * ```
 */
export declare const client: ({ db, schema, }: {
    db: ReadonlyDrizzle<Schema>;
    schema: Schema;
}) => import("hono").MiddlewareHandler<any, string, {}>;
//# sourceMappingURL=index.d.ts.map