import ConnectionParameters from 'pg/lib/connection-parameters';
import { describe, expect, it } from 'vitest';
import {
  PROD_IMPORT_PG_TLS,
  prodImportPgClientConfig,
  sanitizeProdImportDatabaseUrl,
} from './import-mapping-apply';

const base =
  'postgresql://postgres.zdeiezfoemibjgrkyzvs:secret@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

describe('prod import database URL sanitization', () => {
  it('refuses weak or no-verify sslmode and ssl query values', () => {
    for (const mode of ['no-verify', 'disable', 'allow', 'prefer'] as const) {
      expect(() =>
        sanitizeProdImportDatabaseUrl(`${base}?sslmode=${mode}`),
      ).toThrow(/sslmode|TLS|permitted/i);
    }
    expect(() => sanitizeProdImportDatabaseUrl(`${base}?ssl=no-verify`)).toThrow(
      /permitted|TLS/i,
    );
    expect(() =>
      sanitizeProdImportDatabaseUrl('https://example.com/db'),
    ).toThrow(/postgres/i);
  });

  it('strips sslmode=require so explicit ssl wins in ConnectionParameters', () => {
    const config = prodImportPgClientConfig(`${base}?sslmode=require`);
    expect(config.connectionString).not.toMatch(/sslmode=/i);
    expect(config.ssl).toEqual(PROD_IMPORT_PG_TLS);
    const params = new ConnectionParameters(config);
    expect(params.ssl).toEqual({ rejectUnauthorized: true });
  });

  it('refuses other TLS-related query parameters', () => {
    expect(() =>
      sanitizeProdImportDatabaseUrl(`${base}?sslrootcert=/tmp/ca.pem`),
    ).toThrow(/permitted/i);
    expect(() =>
      sanitizeProdImportDatabaseUrl(`${base}?sslnegotiation=direct`),
    ).toThrow(/permitted/i);
  });
});