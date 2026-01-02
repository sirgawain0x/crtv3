import type { Config } from '../config/index.js';
import type { Common } from '../internal/common.js';
import { BuildError } from '../internal/errors.js';
import type { Chain, EventCallback, IndexingBuild, IndexingFunctions, LightBlock, SetupCallback } from '../internal/types.js';
import { type Rpc } from '../rpc/index.js';
import { type Abi, type Address } from "viem";
export declare function buildIndexingFunctions({ common, config, indexingFunctions, configBuild: { chains, rpcs }, }: {
    common: Common;
    config: Config;
    indexingFunctions: IndexingFunctions;
    configBuild: Pick<IndexingBuild, "chains" | "rpcs">;
}): Promise<{
    chains: Chain[];
    rpcs: Rpc[];
    finalizedBlocks: LightBlock[];
    eventCallbacks: EventCallback[][];
    setupCallbacks: SetupCallback[][];
    contracts: {
        [name: string]: {
            abi: Abi;
            address?: Address | readonly Address[];
            startBlock?: number;
            endBlock?: number;
        };
    }[];
    logs: ({
        level: "warn" | "info" | "debug";
        msg: string;
    } & Record<string, unknown>)[];
}>;
export declare function buildConfig({ common, config, }: {
    common: Common;
    config: Config;
}): {
    chains: Chain[];
    rpcs: Rpc[];
    logs: ({
        level: "warn" | "info" | "debug";
        msg: string;
    } & Record<string, unknown>)[];
};
export declare function safeBuildIndexingFunctions({ common, config, indexingFunctions, configBuild, }: {
    common: Common;
    config: Config;
    indexingFunctions: IndexingFunctions;
    configBuild: Pick<IndexingBuild, "chains" | "rpcs">;
}): Promise<{
    readonly status: "success";
    readonly chains: Chain[];
    readonly rpcs: Rpc[];
    readonly finalizedBlocks: LightBlock[];
    readonly eventCallbacks: EventCallback[][];
    readonly setupCallbacks: SetupCallback[][];
    readonly contracts: {
        [name: string]: {
            abi: Abi;
            address?: `0x${string}` | readonly `0x${string}`[] | undefined;
            startBlock?: number | undefined;
            endBlock?: number | undefined;
        };
    }[];
    readonly logs: ({
        level: "warn" | "info" | "debug";
        msg: string;
    } & Record<string, unknown>)[];
    readonly error?: undefined;
} | {
    readonly status: "error";
    readonly error: BuildError;
    readonly chains?: undefined;
    readonly rpcs?: undefined;
    readonly finalizedBlocks?: undefined;
    readonly eventCallbacks?: undefined;
    readonly setupCallbacks?: undefined;
    readonly contracts?: undefined;
    readonly logs?: undefined;
}>;
export declare function safeBuildConfig({ common, config, }: {
    common: Common;
    config: Config;
}): {
    readonly status: "success";
    readonly chains: Chain[];
    readonly rpcs: Rpc[];
    readonly logs: ({
        level: "warn" | "info" | "debug";
        msg: string;
    } & Record<string, unknown>)[];
    readonly error?: undefined;
} | {
    readonly status: "error";
    readonly error: BuildError;
    readonly chains?: undefined;
    readonly rpcs?: undefined;
    readonly logs?: undefined;
};
//# sourceMappingURL=config.d.ts.map