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

/** Certificate-verifying TLS for prod pooler sessions (never plaintext). */
export const PROD_IMPORT_PG_TLS = { rejectUnauthorized: true } as const;

const ALLOWED_SSLMODE = new Set(['require', 'verify-ca', 'verify-full']);

const FORBIDDEN_TLS_QUERY_KEYS = [
  'ssl',
  'sslcert',
  'sslkey',
  'sslrootcert',
  'sslnegotiation',
] as const;

function refusedTlsUrl(message: string): never {
  throw new Error(message);
}

/**
 * Validate prod pooler URLs and strip sslmode so pg uses the explicit ssl config
 * (pg merges connection-string sslmode over config.ssl when sslmode remains).
 */
export function sanitizeProdImportDatabaseUrl(connectionString: string): string {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    refusedTlsUrl(
      'Production import database URL must be a postgres connection string',
    );
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    refusedTlsUrl(
      'Production import database URL must use postgres or postgresql scheme',
    );
  }

  for (const key of [...parsed.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower === 'sslmode') {
      const mode = parsed.searchParams.get(key)?.toLowerCase();
      if (!mode || !ALLOWED_SSLMODE.has(mode)) {
        refusedTlsUrl('Database URL sslmode is not permitted for prod import apply');
      }
      continue;
    }
    if (
      FORBIDDEN_TLS_QUERY_KEYS.includes(
        lower as (typeof FORBIDDEN_TLS_QUERY_KEYS)[number],
      ) ||
      lower.startsWith('ssl')
    ) {
      refusedTlsUrl(`Database URL TLS query parameter is not permitted: ${key}`);
    }
  }

  parsed.searchParams.delete('sslmode');
  for (const key of [...parsed.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('ssl')) {
      parsed.searchParams.delete(key);
    }
  }

  return parsed.toString();
}

/** @deprecated use sanitizeProdImportDatabaseUrl */
export function assertProdImportDatabaseUrl(connectionString: string): void {
  sanitizeProdImportDatabaseUrl(connectionString);
}

export function prodImportPgClientConfig(
  connectionString: string,
): pg.ClientConfig {
  return {
    connectionString: sanitizeProdImportDatabaseUrl(connectionString),
    ssl: PROD_IMPORT_PG_TLS,
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