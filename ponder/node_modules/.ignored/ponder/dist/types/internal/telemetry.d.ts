import type { Options } from './options.js';
import type { Logger } from "./logger.js";
import type { Shutdown } from "./shutdown.js";
import type { IndexingBuild } from "./types.js";
import type { PreBuild, SchemaBuild } from "./types.js";
type TelemetryEvent = {
    name: "lifecycle:session_start";
    properties: {
        cli_command: string;
    };
} | {
    name: "lifecycle:session_end";
    properties: {
        duration_seconds: number;
    };
} | {
    name: "lifecycle:heartbeat_send";
    properties: {
        duration_seconds: number;
    };
};
export type Telemetry = ReturnType<typeof createTelemetry>;
export declare function createTelemetry({ options, logger, shutdown, }: {
    options: Options;
    logger: Logger;
    shutdown: Shutdown;
}): {
    record: (_event: TelemetryEvent) => void;
    flush: () => Promise<void>;
};
export declare function buildPayload({ preBuild, schemaBuild, indexingBuild, }: {
    preBuild: PreBuild;
    schemaBuild?: SchemaBuild;
    indexingBuild?: IndexingBuild;
}): {
    database_kind: "pglite" | "postgres" | "pglite_test";
    contract_count: number;
    network_count: number;
    table_count: number;
    indexing_function_count: number;
};
export {};
//# sourceMappingURL=telemetry.d.ts.map