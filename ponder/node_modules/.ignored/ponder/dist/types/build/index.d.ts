import type { CliOptions } from '../bin/ponder.js';
import type { Config } from '../config/index.js';
import type { Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { ApiBuild, IndexingBuild, IndexingFunctions, NamespaceBuild, PreBuild, Schema, SchemaBuild } from '../internal/types.js';
import type { Result } from '../utils/result.js';
import { Hono } from "hono";
declare global {
    var PONDER_COMMON: Common;
    var PONDER_PRE_BUILD: PreBuild;
    var PONDER_NAMESPACE_BUILD: NamespaceBuild;
    var PONDER_INDEXING_BUILD: Pick<IndexingBuild, "chains" | "rpcs">;
    var PONDER_DATABASE: Database;
}
type ConfigResult = Result<{
    config: Config;
    contentHash: string;
}>;
type SchemaResult = Result<{
    schema: Schema;
    contentHash: string;
}>;
type IndexingResult = Result<{
    indexingFunctions: IndexingFunctions;
    contentHash: string;
}>;
type ApiResult = Result<{
    app: Hono;
}>;
export type Build = {
    executeConfig: () => Promise<ConfigResult>;
    executeSchema: () => Promise<SchemaResult>;
    executeIndexingFunctions: () => Promise<IndexingResult>;
    executeApi: (params: {
        preBuild: PreBuild;
        configBuild: Pick<IndexingBuild, "chains" | "rpcs">;
        database: Database;
    }) => Promise<ApiResult>;
    namespaceCompile: () => Result<NamespaceBuild>;
    preCompile: (params: {
        config: Config;
    }) => Result<PreBuild>;
    compileSchema: (params: {
        schema: Schema;
        preBuild: PreBuild;
    }) => Result<SchemaBuild>;
    compileConfig: (params: {
        configResult: Extract<ConfigResult, {
            status: "success";
        }>["result"];
    }) => Result<Pick<IndexingBuild, "chains" | "rpcs">>;
    compileIndexing: (params: {
        configResult: Extract<ConfigResult, {
            status: "success";
        }>["result"];
        schemaResult: Extract<SchemaResult, {
            status: "success";
        }>["result"];
        indexingResult: Extract<IndexingResult, {
            status: "success";
        }>["result"];
        configBuild: Pick<IndexingBuild, "chains" | "rpcs">;
    }) => Promise<Result<IndexingBuild>>;
    compileApi: (params: {
        apiResult: Extract<ApiResult, {
            status: "success";
        }>["result"];
    }) => Promise<Result<ApiBuild>>;
    startDev: (params: {
        onReload: (kind: "indexing" | "api") => void;
    }) => void;
    rpcDiagnostic: (params: {
        configBuild: Pick<IndexingBuild, "chains" | "rpcs">;
    }) => Promise<Result<void>>;
    databaseDiagnostic: (params: {
        preBuild: PreBuild;
    }) => Promise<Result<void>>;
};
export declare const createBuild: ({ common, cliOptions, }: {
    common: Common;
    cliOptions: CliOptions;
}) => Promise<Build>;
export {};
//# sourceMappingURL=index.d.ts.map