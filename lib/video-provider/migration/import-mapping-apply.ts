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

/** Refuse plaintext / disabled TLS; TLS is always forced on the pg client. */
export function assertProdImportDatabaseUrl(connectionString: string): void {
  if (
    !connectionString.startsWith('postgresql://') &&
    !connectionString.startsWith('postgres://')
  ) {
    throw new Error(
      'Production import database URL must be a postgres connection string',
    );
  }
  const lowered = connectionString.toLowerCase();
  if (
    lowered.includes('sslmode=disable') ||
    lowered.includes('ssl=false') ||
    lowered.includes('ssl=0')
  ) {
    throw new Error('Plaintext or disabled TLS database URLs are refused');
  }
}

export function prodImportPgClientConfig(
  connectionString: string,
): pg.ClientConfig {
  assertProdImportDatabaseUrl(connectionString);
  return {
    connectionString,
    ssl: { rejectUnauthorized: true },
  };
}

export async function executeImportMappingCopySql(
  connectionString: string,
  sql: string,
): Promise<void> {
  const client = new pg.Client(prodImportPgClientConfig(connectionString));
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}