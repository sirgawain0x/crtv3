import type { Common } from '../../internal/common.js';
import type { Options } from '../../internal/options.js';
/** Sets up shutdown handlers for the process. Accepts additional cleanup logic to run. */
export declare const createExit: ({ common, options, }: {
    common: Pick<Common, "logger" | "telemetry" | "shutdown" | "buildShutdown" | "apiShutdown">;
    options: Options;
}) => ({ code }: {
    code: 0 | 1 | 75;
}) => Promise<void>;
//# sourceMappingURL=exit.d.ts.map