import type { Common } from '../internal/common.js';
import type { CrashRecoveryCheckpoint, NamespaceBuild } from '../internal/types.js';
export declare function isolatedWorker({ options, namespaceBuild, crashRecoveryCheckpoint, chainIds, }: {
    options: Common["options"];
    namespaceBuild: NamespaceBuild;
    crashRecoveryCheckpoint: CrashRecoveryCheckpoint;
    chainIds: number[];
}): Promise<void>;
//# sourceMappingURL=isolatedWorker.d.ts.map