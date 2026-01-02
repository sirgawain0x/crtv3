import { getLiveQueryChannelName } from '../drizzle/onchain.js';
import { promiseWithResolvers, } from '../utils/promiseWithResolvers.js';
import { getSQLQueryRelations, validateAllowableSQLQuery, } from '../utils/sql-parse.js';
import { getTableName, getViewName, isTable, isView, } from "drizzle-orm";
import { getViewConfig, pgSchema, pgTable, } from "drizzle-orm/pg-core";
import { createMiddleware } from "hono/factory";
import { streamSSE } from "hono/streaming";
import superjson from "superjson";
const MAX_LIVE_QUERIES = 1000;
/**
 * @dev This is copied to avoid bundling another dependency.
 */
const getPonderMetaTable = (schema) => {
    if (schema === undefined || schema === "public") {
        return pgTable("_ponder_meta", (t) => ({
            key: t.text().primaryKey().$type(),
            value: t.jsonb().$type().notNull(),
        }));
    }
    return pgSchema(schema).table("_ponder_meta", (t) => ({
        key: t.text().primaryKey().$type(),
        value: t.jsonb().$type().notNull(),
    }));
};
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
export const client = ({ db, schema, }) => {
    if (globalThis.PONDER_COMMON === undefined ||
        globalThis.PONDER_DATABASE === undefined ||
        globalThis.PONDER_NAMESPACE_BUILD === undefined ||
        globalThis.PONDER_PRE_BUILD === undefined) {
        throw new Error("client() middleware cannot be initialized outside of a Ponder project");
    }
    const tables = Object.values(schema).filter(isTable);
    const views = Object.values(schema).filter(isView);
    const tableNames = new Set(tables.map(getTableName));
    const viewNames = new Set(views.map(getViewName));
    // Note: Add system tables to the live query registry.
    tableNames.add("_ponder_checkpoint");
    // @ts-ignore
    const session = db._.session;
    // @ts-ignore
    const dialect = session.dialect;
    const driver = globalThis.PONDER_DATABASE.driver;
    const perTableResolver = new Map();
    const perViewTables = new Map();
    /** `true` if the app is indexing live blocks. */
    let liveQueryCount = 0;
    let isReady = false;
    (async () => {
        while (globalThis.PONDER_COMMON.apiShutdown.isKilled === false) {
            try {
                isReady = await globalThis.PONDER_DATABASE.readonlyQB.wrap({ label: "select_ready" }, (db) => db
                    .select()
                    .from(getPonderMetaTable())
                    .then((result) => result[0].value.is_ready === 1));
            }
            catch { }
            if (isReady)
                return;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    })();
    const cache = new Map();
    const perQueryReferences = new Map();
    const registry = new FinalizationRegistry((queryString) => {
        // Note: When a cache entry is garbage collected, delete the key from `perQueryReferences`.
        cache.delete(queryString);
        perQueryReferences.delete(queryString);
    });
    for (const table of tableNames) {
        perTableResolver.set(table, promiseWithResolvers());
    }
    const parseViewPromise = (async () => {
        const unresolvedViewRelations = new Map();
        for (const view of views) {
            const query = dialect.sqlToQuery(getViewConfig(view).query);
            const relations = await getSQLQueryRelations(query.sql);
            unresolvedViewRelations.set(getViewName(view), relations);
        }
        /**
         * Recursively resolve nested views (views that reference other views).
         *
         * @dev This assumes views cannot be infinitely cursive - an invariant enforced by Postgres.
         */
        const resolveRelation = (relation) => {
            if (perViewTables.has(relation)) {
                return perViewTables.get(relation);
            }
            if (tableNames.has(relation)) {
                return new Set([relation]);
            }
            if (viewNames.has(relation)) {
                const result = new Set();
                for (const _relation of unresolvedViewRelations.get(relation)) {
                    for (const __relation of resolveRelation(_relation)) {
                        result.add(__relation);
                    }
                }
                return result;
            }
            return new Set();
        };
        for (const [viewName, relations] of unresolvedViewRelations) {
            const resolvedRelations = new Set();
            for (const relation of relations) {
                for (const _relation of resolveRelation(relation)) {
                    resolvedRelations.add(_relation);
                }
            }
            perViewTables.set(viewName, resolvedRelations);
        }
    })();
    if (driver.dialect === "pglite") {
        const channel = getLiveQueryChannelName(globalThis.PONDER_NAMESPACE_BUILD.schema);
        driver.instance.query(`LISTEN "${channel}"`);
        driver.instance.onNotification((_, payload) => {
            const tables = JSON.parse(payload);
            tables.push("_ponder_checkpoint");
            let invalidQueryCount = 0;
            for (const [queryString, referencedTables] of perQueryReferences) {
                let isQueryInvalid = false;
                for (const table of tables) {
                    if (referencedTables.has(table)) {
                        isQueryInvalid = true;
                        break;
                    }
                }
                if (isQueryInvalid) {
                    invalidQueryCount++;
                    const resultPromise = cache.get(queryString)?.deref();
                    if (resultPromise)
                        registry.unregister(resultPromise);
                    cache.delete(queryString);
                    perQueryReferences.delete(queryString);
                }
            }
            for (const table of tables) {
                perTableResolver.get(table).resolve();
                perTableResolver.set(table, promiseWithResolvers());
            }
            if (invalidQueryCount > 0) {
                globalThis.PONDER_COMMON.logger.debug({
                    msg: "Updated live queries",
                    tables: JSON.stringify(Array.from(tables)),
                    query_count: invalidQueryCount,
                });
            }
        });
    }
    else {
        (async () => {
            let client;
            let hasRegisteredShutdown = false;
            while (globalThis.PONDER_COMMON.apiShutdown.isKilled === false) {
                // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
                await new Promise(async (resolve) => {
                    try {
                        client = await driver.admin.connect();
                        if (hasRegisteredShutdown === false) {
                            globalThis.PONDER_COMMON.apiShutdown.add(() => {
                                client?.release();
                                client = undefined;
                            });
                            hasRegisteredShutdown = true;
                        }
                        globalThis.PONDER_COMMON.logger.info({
                            msg: `Established listen connection for "@ponder/client" middleware`,
                        });
                        client.on("notification", (notification) => {
                            let tables = JSON.parse(notification.payload);
                            // Convert partition names to table names
                            if (globalThis.PONDER_PRE_BUILD.ordering === "experimental_isolated") {
                                tables = tables.map((table) => {
                                    const _table = table.split("_");
                                    _table.pop();
                                    return _table.join("_");
                                });
                            }
                            tables.push("_ponder_checkpoint");
                            let invalidQueryCount = 0;
                            for (const [queryString, referencedTables,] of perQueryReferences) {
                                let isQueryInvalid = false;
                                for (const table of tables) {
                                    if (referencedTables.has(table)) {
                                        isQueryInvalid = true;
                                        break;
                                    }
                                }
                                if (isQueryInvalid) {
                                    invalidQueryCount++;
                                    const resultPromise = cache.get(queryString)?.deref();
                                    if (resultPromise)
                                        registry.unregister(resultPromise);
                                    cache.delete(queryString);
                                    perQueryReferences.delete(queryString);
                                }
                            }
                            for (const table of tables) {
                                perTableResolver.get(table).resolve();
                                perTableResolver.set(table, promiseWithResolvers());
                            }
                            if (invalidQueryCount > 0) {
                                globalThis.PONDER_COMMON.logger.debug({
                                    msg: "Updated live queries",
                                    tables: JSON.stringify(tables),
                                    query_count: invalidQueryCount,
                                });
                            }
                        });
                        client.on("error", async (error) => {
                            globalThis.PONDER_COMMON.logger.warn({
                                msg: `Failed listen connection for "@ponder/client" middleware`,
                                retry_delay: 250,
                                error,
                            });
                            client?.release();
                            client = undefined;
                            await new Promise((resolve) => setTimeout(resolve, 250));
                            resolve();
                        });
                        const channel = getLiveQueryChannelName(globalThis.PONDER_NAMESPACE_BUILD.schema);
                        await client.query(`LISTEN "${channel}"`);
                    }
                    catch (error) {
                        globalThis.PONDER_COMMON.logger.warn({
                            msg: `Failed listen connection for "@ponder/client" middleware`,
                            retry_delay: 250,
                            error: error,
                        });
                        client?.release();
                        client = undefined;
                        await new Promise((resolve) => setTimeout(resolve, 250));
                        resolve();
                    }
                });
            }
        })();
    }
    const getQueryResult = (query) => {
        if (driver.dialect === "pglite") {
            return session.prepareQuery(query, undefined, undefined, false).execute();
        }
        else {
            return globalThis.PONDER_DATABASE.readonlyQB.raw.transaction((tx) => {
                return tx._.session
                    .prepareQuery(query, undefined, undefined, false)
                    .execute();
            }, { accessMode: "read only" });
        }
    };
    return createMiddleware(async (c, next) => {
        const crypto = await import(/* webpackIgnore: true */ "node:crypto");
        await parseViewPromise;
        if (c.req.path === "/sql/db") {
            const queryString = c.req.query("sql");
            if (queryString === undefined) {
                return c.text('Missing "sql" query parameter', 400);
            }
            const query = superjson.parse(queryString);
            try {
                await validateAllowableSQLQuery(query.sql);
            }
            catch (error) {
                error.stack = undefined;
                return c.text(error.message, 500);
            }
            const relations = await getSQLQueryRelations(query.sql);
            const referencedTables = new Set();
            for (const relation of relations) {
                if (tableNames.has(relation)) {
                    referencedTables.add(relation);
                }
                else if (viewNames.has(relation)) {
                    for (const tableName of perViewTables.get(relation)) {
                        referencedTables.add(tableName);
                    }
                }
            }
            let resultPromise;
            if (isReady === false) {
                resultPromise = getQueryResult(query);
            }
            else if (cache.has(queryString)) {
                const resultRef = cache.get(queryString).deref();
                if (resultRef === undefined) {
                    cache.delete(queryString);
                    resultPromise = getQueryResult(query);
                    cache.set(queryString, new WeakRef(resultPromise));
                    perQueryReferences.set(queryString, referencedTables);
                    registry.register(resultPromise, queryString);
                }
                else {
                    resultPromise = resultRef;
                }
            }
            else {
                resultPromise = getQueryResult(query);
                cache.set(queryString, new WeakRef(resultPromise));
                perQueryReferences.set(queryString, referencedTables);
                registry.register(resultPromise, queryString);
            }
            try {
                return c.json((await resultPromise));
            }
            catch (error) {
                error.stack = undefined;
                return c.text(error.message, 500);
            }
        }
        if (c.req.path === "/sql/live") {
            if (isReady === false) {
                return c.text("Live queries are not available until the backfill is complete", 503);
            }
            if (liveQueryCount >= MAX_LIVE_QUERIES) {
                return c.text("Maximum number of live queries reached", 503);
            }
            liveQueryCount++;
            c.header("Content-Type", "text/event-stream");
            c.header("Cache-Control", "no-cache");
            c.header("Connection", "keep-alive");
            const queryString = c.req.query("sql");
            if (queryString === undefined) {
                return c.text('Missing "sql" query parameter', 400);
            }
            const query = superjson.parse(queryString);
            try {
                await validateAllowableSQLQuery(query.sql);
            }
            catch (error) {
                error.stack = undefined;
                return c.text(error.message, 500);
            }
            const relations = await getSQLQueryRelations(query.sql);
            const referencedTables = new Set();
            for (const relation of relations) {
                if (tableNames.has(relation)) {
                    referencedTables.add(relation);
                }
                else if (viewNames.has(relation)) {
                    for (const tableName of perViewTables.get(relation)) {
                        referencedTables.add(tableName);
                    }
                }
            }
            let result;
            if (cache.has(queryString)) {
                const resultRef = cache.get(queryString).deref();
                if (resultRef === undefined) {
                    cache.delete(queryString);
                    const resultPromise = getQueryResult(query);
                    cache.set(queryString, new WeakRef(resultPromise));
                    perQueryReferences.set(queryString, referencedTables);
                    registry.register(resultPromise, queryString);
                    result = await resultPromise;
                }
                else {
                    result = await resultRef;
                }
            }
            else {
                const resultPromise = getQueryResult(query);
                cache.set(queryString, new WeakRef(resultPromise));
                perQueryReferences.set(queryString, referencedTables);
                registry.register(resultPromise, queryString);
                result = await resultPromise;
            }
            let resultHash = crypto
                .createHash("MD5")
                // @ts-ignore
                .update(JSON.stringify(result.rows))
                .digest("hex")
                .slice(0, 10);
            return streamSSE(c, async (stream) => {
                stream.onAbort(() => {
                    liveQueryCount--;
                });
                while (stream.closed === false && stream.aborted === false) {
                    await Promise.race(Array.from(referencedTables).map((relation) => perTableResolver.get(relation).promise));
                    try {
                        let resultPromise;
                        if (cache.has(queryString)) {
                            const resultRef = cache.get(queryString).deref();
                            if (resultRef === undefined) {
                                cache.delete(queryString);
                                resultPromise = getQueryResult(query);
                                cache.set(queryString, new WeakRef(resultPromise));
                                perQueryReferences.set(queryString, referencedTables);
                                registry.register(resultPromise, queryString);
                            }
                            else {
                                resultPromise = resultRef;
                            }
                        }
                        else {
                            resultPromise = getQueryResult(query);
                            cache.set(queryString, new WeakRef(resultPromise));
                            perQueryReferences.set(queryString, referencedTables);
                            registry.register(resultPromise, queryString);
                        }
                        const result = await resultPromise;
                        const _resultHash = crypto
                            .createHash("MD5")
                            // @ts-ignore
                            .update(JSON.stringify(result.rows))
                            .digest("hex")
                            .slice(0, 10);
                        if (_resultHash === resultHash)
                            continue;
                        resultHash = _resultHash;
                        // @ts-ignore
                        await stream.writeSSE({ data: JSON.stringify(result) });
                    }
                    catch {
                        stream.abort();
                    }
                }
            });
        }
        return next();
    });
};
//# sourceMappingURL=index.js.map