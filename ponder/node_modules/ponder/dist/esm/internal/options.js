import path from "node:path";
import v8 from "node:v8";
import { parse } from "semver";
export const buildOptions = ({ cliOptions }) => {
    let rootDir;
    if (cliOptions.root !== undefined) {
        rootDir = path.resolve(cliOptions.root);
    }
    else {
        rootDir = path.resolve(".");
    }
    let logLevel;
    if (cliOptions.logLevel) {
        logLevel = cliOptions.logLevel;
    }
    else if (cliOptions.trace === true) {
        logLevel = "trace";
    }
    else if (cliOptions.debug === true) {
        logLevel = "debug";
    }
    else if (process.env.PONDER_LOG_LEVEL !== undefined &&
        ["silent", "fatal", "error", "warn", "info", "debug", "trace"].includes(process.env.PONDER_LOG_LEVEL)) {
        logLevel = process.env.PONDER_LOG_LEVEL;
    }
    else {
        logLevel = "info";
    }
    const port = process.env.PORT !== undefined
        ? Number(process.env.PORT)
        : cliOptions.port !== undefined
            ? cliOptions.port
            : 42069;
    const hostname = cliOptions.hostname;
    return {
        command: cliOptions.command,
        version: parse(cliOptions.version),
        rootDir,
        configFile: path.join(rootDir, cliOptions.config),
        schemaFile: path.join(rootDir, "ponder.schema.ts"),
        apiDir: path.join(rootDir, "src", "api"),
        apiFile: path.join(rootDir, "src", "api", "index.ts"),
        indexingDir: path.join(rootDir, "src"),
        generatedDir: path.join(rootDir, "generated"),
        ponderDir: path.join(rootDir, ".ponder"),
        logDir: path.join(rootDir, ".ponder", "logs"),
        port,
        hostname,
        telemetryUrl: "https://ponder.sh/api/telemetry",
        telemetryDisabled: Boolean(process.env.PONDER_TELEMETRY_DISABLED),
        telemetryConfigDir: undefined,
        logLevel,
        logFormat: cliOptions.logFormat,
        databaseHeartbeatInterval: 10 * 1000,
        databaseHeartbeatTimeout: 25 * 1000,
        // Half of the max query parameters for PGlite
        databaseMaxQueryParameters: 16000,
        maxThreads: process.env.PONDER_MAX_THREADS !== undefined
            ? Number(process.env.PONDER_MAX_THREADS)
            : 4,
        factoryAddressCountThreshold: 1000,
        rpcMaxConcurrency: 256,
        // v8.getHeapStatistics().heap_size_limit / 5, rounded up to the nearest 64 MB
        indexingCacheMaxBytes: process.env.PONDER_CACHE_BYTES !== undefined
            ? Number(process.env.PONDER_CACHE_BYTES)
            : Math.ceil(v8.getHeapStatistics().heap_size_limit / 1024 / 1024 / 5 / 64) *
                64 *
                1024 *
                1024,
        syncEventsQuerySize: 12000,
    };
};
//# sourceMappingURL=options.js.map