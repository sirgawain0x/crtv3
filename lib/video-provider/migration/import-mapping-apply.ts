import pg from 'pg';
import {
  renderImportMappingCopySql,
  type ImportMappingCopyPlan,
} from './import-mapping-copy';

/** Runs reviewed apply SQL in one postgres session transaction. */
export async function applyImportMappingCopyPlan(
  plan: ImportMappingCopyPlan,
  runSql: (sql: string) => Promise<void>,
): Promise<void> {
  if (plan.conflicts) {
    throw new Error(
      `Refusing apply with ${plan.conflicts} import mapping conflict(s)`,
    );
  }
  if (!plan.plannedInserts) {
    throw new Error('Nothing to apply: target already has the reviewed ready set');
  }
  const sql = renderImportMappingCopySql(plan, 'apply');
  await runSql(sql);
}

export async function executeImportMappingCopySql(
  connectionString: string,
  sql: string,
): Promise<void> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}