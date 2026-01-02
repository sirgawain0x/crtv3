var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _PGliteDriver_client, _PGliteConnection_client;
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { CompiledQuery, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, } from "kysely";
export function createPglite(options) {
    // PGlite uses the memory FS by default, and Windows doesn't like the
    // "memory://" path, so it's better to pass `undefined` here.
    if (options.dataDir === "memory://") {
        // @ts-expect-error
        options.dataDir = undefined;
    }
    else {
        mkdirSync(options.dataDir, { recursive: true });
    }
    return new PGlite(options);
}
// Adapted from dnlsandiego/kysely-pglite
// https://github.com/dnlsandiego/kysely-pglite/blob/3891a0c4d9327a21bff26addf371784f0109260b/src/kysely-pglite.ts
export function createPgliteKyselyDialect(instance) {
    return {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => new PGliteDriver(instance),
        createIntrospector: (db) => new PostgresIntrospector(db),
        createQueryCompiler: () => new PostgresQueryCompiler(),
    };
}
// Adapted from dnlsandiego/kysely-pglite
// https://github.com/dnlsandiego/kysely-pglite/blob/3891a0c4d9327a21bff26addf371784f0109260b/src/pglite-driver.ts
export class PGliteDriver {
    constructor(client) {
        _PGliteDriver_client.set(this, void 0);
        __classPrivateFieldSet(this, _PGliteDriver_client, client, "f");
    }
    async acquireConnection() {
        return new PGliteConnection(__classPrivateFieldGet(this, _PGliteDriver_client, "f"));
    }
    async beginTransaction(connection, _settings) {
        await connection.executeQuery(CompiledQuery.raw("BEGIN"));
    }
    async commitTransaction(connection) {
        await connection.executeQuery(CompiledQuery.raw("COMMIT"));
    }
    async rollbackTransaction(connection) {
        await connection.executeQuery(CompiledQuery.raw("ROLLBACK"));
    }
    async destroy() {
        await __classPrivateFieldGet(this, _PGliteDriver_client, "f").close();
    }
    async init() { }
    async releaseConnection(_connection) { }
}
_PGliteDriver_client = new WeakMap();
class PGliteConnection {
    constructor(client) {
        _PGliteConnection_client.set(this, void 0);
        __classPrivateFieldSet(this, _PGliteConnection_client, client, "f");
    }
    async executeQuery(compiledQuery) {
        return await __classPrivateFieldGet(this, _PGliteConnection_client, "f").query(compiledQuery.sql, [
            ...compiledQuery.parameters,
        ]);
    }
    // biome-ignore lint/correctness/useYield: <explanation>
    async *streamQuery() {
        throw new Error("PGlite does not support streaming.");
    }
}
_PGliteConnection_client = new WeakMap();
//# sourceMappingURL=pglite.js.map