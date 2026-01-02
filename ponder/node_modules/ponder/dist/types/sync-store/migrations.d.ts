import { type Logger } from '../internal/logger.js';
import type { Migration, MigrationProvider } from "kysely";
declare class StaticMigrationProvider implements MigrationProvider {
    getMigrations(): Promise<Record<string, Migration>>;
}
export declare function buildMigrationProvider(logger_: Logger): StaticMigrationProvider;
export {};
//# sourceMappingURL=migrations.d.ts.map