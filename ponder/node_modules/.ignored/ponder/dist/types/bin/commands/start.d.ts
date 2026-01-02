import { type Database } from '../../database/index.js';
import type { Common } from '../../internal/common.js';
import type { ApiBuild, CrashRecoveryCheckpoint, IndexingBuild, NamespaceBuild, PreBuild, SchemaBuild } from '../../internal/types.js';
import type { CliOptions } from "../ponder.js";
export type PonderApp = {
    common: Common;
    preBuild: PreBuild;
    namespaceBuild: NamespaceBuild;
    schemaBuild: SchemaBuild;
    indexingBuild: IndexingBuild;
    apiBuild: ApiBuild;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    database: Database;
};
export declare function start({ cliOptions, onBuild, }: {
    cliOptions: CliOptions;
    onBuild?: (app: PonderApp) => Promise<PonderApp>;
}): Promise<(() => Promise<void>) | undefined>;
//# sourceMappingURL=start.d.ts.map