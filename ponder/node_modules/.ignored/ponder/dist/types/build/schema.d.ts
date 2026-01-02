import { BuildError } from '../internal/errors.js';
import type { PreBuild, Schema } from '../internal/types.js';
export declare const buildSchema: ({ schema, preBuild, }: {
    schema: Schema;
    preBuild: Pick<PreBuild, "ordering">;
}) => {
    statements: import("@/drizzle/kit/index.js").SqlStatements;
};
export declare const safeBuildSchema: ({ schema, preBuild, }: {
    schema: Schema;
    preBuild: Pick<PreBuild, "ordering">;
}) => {
    readonly statements: import("@/drizzle/kit/index.js").SqlStatements;
    readonly status: "success";
    readonly error?: undefined;
} | {
    readonly status: "error";
    readonly error: BuildError;
};
//# sourceMappingURL=schema.d.ts.map