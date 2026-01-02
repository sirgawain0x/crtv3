import { type Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { ApiBuild } from '../internal/types.js';
import { Hono } from "hono";
export type Server = {
    hono: Hono;
};
export declare function createServer({ common, database, apiBuild, }: {
    common: Common;
    database: Database;
    apiBuild: ApiBuild;
}): Promise<Server>;
//# sourceMappingURL=index.d.ts.map