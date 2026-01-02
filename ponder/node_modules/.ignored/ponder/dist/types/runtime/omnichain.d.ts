import { type Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { Chain, CrashRecoveryCheckpoint, IndexingBuild, NamespaceBuild, PreBuild, SchemaBuild } from '../internal/types.js';
import { type SyncProgress } from "./index.js";
export declare function runOmnichain({ common, preBuild, namespaceBuild, schemaBuild, indexingBuild, crashRecoveryCheckpoint, database, }: {
    common: Common;
    preBuild: PreBuild;
    namespaceBuild: NamespaceBuild;
    schemaBuild: SchemaBuild;
    indexingBuild: IndexingBuild;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    database: Database;
}): Promise<void>;
/**
 * Compute the checkpoint across all chains.
 */
export declare const getOmnichainCheckpoint: <tag extends "finalized" | "start" | "end" | "current">({ perChainSync, tag, }: {
    perChainSync: Map<Chain, {
        syncProgress: SyncProgress;
    }>;
    tag: tag;
}) => tag extends "end" ? string | undefined : string;
//# sourceMappingURL=omnichain.d.ts.map