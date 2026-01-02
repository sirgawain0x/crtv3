import type { QB } from '../database/queryBuilder.js';
import type { Schema } from '../internal/types.js';
import DataLoader from "dataloader";
import { type TableRelationalConfig } from "drizzle-orm";
import { GraphQLSchema } from "graphql";
export declare function buildGraphQLSchema({ schema, }: {
    schema: Schema;
}): GraphQLSchema;
export declare function buildDataLoaderCache(qb: QB): ({ table }: {
    table: TableRelationalConfig;
}) => DataLoader<string, any, string>;
//# sourceMappingURL=index.d.ts.map