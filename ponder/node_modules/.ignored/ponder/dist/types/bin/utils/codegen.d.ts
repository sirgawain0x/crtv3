import type { Common } from '../../internal/common.js';
export declare const ponderEnv = "/// <reference types=\"ponder/virtual\" />\n\ndeclare module \"ponder:internal\" {\n  const config: typeof import(\"./ponder.config.ts\");\n  const schema: typeof import(\"./ponder.schema.ts\");\n}\n\ndeclare module \"ponder:schema\" {\n  export * from \"./ponder.schema.ts\";\n}\n\n// This file enables type checking and editor autocomplete for this Ponder project.\n// After upgrading, you may find that changes have been made to this file.\n// If this happens, please commit the changes. Do not manually edit this file.\n// See https://ponder.sh/docs/requirements#typescript for more information.\n";
export declare function runCodegen({ common }: {
    common: Common;
}): void;
//# sourceMappingURL=codegen.d.ts.map