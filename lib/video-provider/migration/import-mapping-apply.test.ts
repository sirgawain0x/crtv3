import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const connect = vi.fn();
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const end = vi.fn();
  const Client = vi.fn(() => ({ connect, query, end }));
  return { connect, query, end, Client };
});

vi.mock('pg', () => ({
  default: {
    Client: mocks.Client,
  },
}));

import {
  applyImportMappingCopyPlan,
  assertProdImportDatabaseUrl,
  executeImportMappingCopySql,
  prodImportPgClientConfig,
} from './import-mapping-apply';
import {
  buildImportMappingCopyPlan,
  type ImportLedgerRow,
} from './import-mapping-copy';

const sourceId = '2499b6b6-314f-4251-b119-fbb6445a48a5';
const prodUrl =
  'postgresql://postgres.zdeiezfoemibjgrkyzvs:secret@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

function readyRow(id: string): ImportLedgerRow {
  return {
    livepeer_asset_id: id,
    livepeer_playback_id: `${id.slice(0, 8)}-play`,
    source_sha256: 'a'.repeat(64),
    source_bytes: 123,
    state: 'ready',
    frameworks_asset_id: `fw-asset-${id.slice(0, 8)}`,
    frameworks_playback_id: `fw-play-${id.slice(0, 8)}`,
  };
}

async function ledgerFixture() {
  const db = new PGlite();
  await db.exec(`CREATE TABLE frameworks_asset_imports(
    livepeer_asset_id uuid PRIMARY KEY,
    livepeer_playback_id text,
    source_sha256 text,
    source_bytes bigint,
    state text,
    frameworks_asset_id text UNIQUE,
    frameworks_playback_id text UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );`);
  return db;
}

describe('applyImportMappingCopyPlan', () => {
  it('executes generated SQL through the injected runner', async () => {
    const db = await ledgerFixture();
    try {
      const plan = buildImportMappingCopyPlan({
        source: [readyRow(sourceId)],
        target: [],
      });
      await applyImportMappingCopyPlan(plan, (sql) => db.exec(sql));
      expect((await db.query('SELECT count(*)::int AS n FROM frameworks_asset_imports')).rows).toEqual(
        [{ n: 1 }],
      );
    } finally {
      await db.close();
    }
  }, 30000);

  it('forces TLS on pg Client for production session URLs', async () => {
    mocks.connect.mockClear();
    mocks.query.mockClear();
    mocks.end.mockClear();
    mocks.Client.mockClear();
    const plan = buildImportMappingCopyPlan({
      source: [readyRow(sourceId)],
      target: [],
    });
    await applyImportMappingCopyPlan(plan, (sql) =>
      executeImportMappingCopySql(prodUrl, sql),
    );
    expect(prodImportPgClientConfig(prodUrl)).toEqual({
      connectionString: prodUrl,
      ssl: { rejectUnauthorized: true },
    });
    expect(mocks.Client).toHaveBeenCalledWith({
      connectionString: prodUrl,
      ssl: { rejectUnauthorized: true },
    });
    expect(mocks.connect).toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalled();
  });

  it('refuses plaintext or sslmode=disable database URLs', () => {
    expect(() =>
      assertProdImportDatabaseUrl(
        'postgresql://x?sslmode=disable',
      ),
    ).toThrow(/TLS/i);
    expect(() => prodImportPgClientConfig('http://not-postgres')).toThrow();
  });
});