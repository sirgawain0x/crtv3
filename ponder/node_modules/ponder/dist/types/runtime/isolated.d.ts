import { type Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { CrashRecoveryCheckpoint, IndexingBuild, NamespaceBuild, PreBuild, SchemaBuild } from '../internal/types.js';
export declare function runIsolated({ common, preBuild, namespaceBuild, schemaBuild, indexingBuild, crashRecoveryCheckpoint, database, onReady, }: {
    common: Common;
    preBuild: PreBuild;
    namespaceBuild: NamespaceBuild;
    schemaBuild: SchemaBuild;
    indexingBuild: IndexingBuild;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    database: Database;
    onReady: () => void;
}): Promise<void>;
//# sourceMappingURL=isolated.d.ts.map