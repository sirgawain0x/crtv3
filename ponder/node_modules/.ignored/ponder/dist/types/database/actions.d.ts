import type { Logger } from '../internal/logger.js';
import type { NamespaceBuild, PreBuild, SchemaBuild } from '../internal/types.js';
import { type Table, type View } from "drizzle-orm";
import type { QB } from "./queryBuilder.js";
export declare const createIndexes: (qb: QB, { statements }: {
    statements: SchemaBuild["statements"];
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const createTriggers: (qb: QB, { tables, chainId }: {
    tables: Table[];
    chainId?: number | undefined;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const dropTriggers: (qb: QB, { tables, chainId }: {
    tables: Table[];
    chainId?: number | undefined;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const createLiveQueryTriggers: (qb: QB, { namespaceBuild, tables, chainId, }: {
    namespaceBuild: NamespaceBuild;
    tables: Table[];
    chainId?: number | undefined;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const dropLiveQueryTriggers: (qb: QB, { namespaceBuild, tables, chainId, }: {
    namespaceBuild: NamespaceBuild;
    tables: Table[];
    chainId?: number | undefined;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const createLiveQueryProcedures: (qb: QB, { namespaceBuild }: {
    namespaceBuild: NamespaceBuild;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const createViews: (qb: QB, { tables, views, namespaceBuild, }: {
    tables: Table[];
    views: View[];
    namespaceBuild: NamespaceBuild;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const revertOmnichain: (qb: QB, { checkpoint, tables, }: {
    checkpoint: string;
    tables: Table[];
}, context?: {
    logger?: Logger;
}) => Promise<number[]>;
export declare const revertMultichain: (qb: QB, { checkpoint, tables, }: {
    checkpoint: string;
    tables: Table[];
}, context?: {
    logger?: Logger;
}) => Promise<number[]>;
export declare const revertIsolated: (qb: QB, { checkpoint, tables, }: {
    checkpoint: string;
    tables: Table[];
}, context?: {
    logger?: Logger;
}) => Promise<number[]>;
export declare const finalizeOmnichain: (qb: QB, { checkpoint, tables, namespaceBuild, }: {
    checkpoint: string;
    tables: Table[];
    namespaceBuild: NamespaceBuild;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const finalizeMultichain: (qb: QB, { checkpoint, tables, namespaceBuild, }: {
    checkpoint: string;
    tables: Table[];
    namespaceBuild: NamespaceBuild;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const finalizeIsolated: (qb: QB, { checkpoint, tables, namespaceBuild, }: {
    checkpoint: string;
    tables: Table[];
    namespaceBuild: NamespaceBuild;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const commitBlock: (qb: QB, { checkpoint, table, preBuild, }: {
    checkpoint: string;
    table: Table;
    preBuild: Pick<PreBuild, "ordering">;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
export declare const crashRecovery: (qb: QB, { table }: {
    table: Table;
}, context?: {
    logger?: Logger;
}) => Promise<void>;
//# sourceMappingURL=actions.d.ts.map