import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

const connect = vi.fn();
const query = vi.fn().mockResolvedValue({ rows: [] });
const end = vi.fn();

vi.mock('pg', () => ({
  default: {
    Client: vi.fn(() => ({ connect, query, end })),
  },
}));

import {
  applyImportMappingCopyPlan,
  executeImportMappingCopySql,
} from './import-mapping-apply';
import {
  buildImportMappingCopyPlan,
  type ImportLedgerRow,
} from './import-mapping-copy';

const sourceId = '2499b6b6-314f-4251-b119-fbb6445a48a5';

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

  it('uses pg Client for production session URLs', async () => {
    connect.mockClear();
    query.mockClear();
    end.mockClear();
    const plan = buildImportMappingCopyPlan({
      source: [readyRow(sourceId)],
      target: [],
    });
    await applyImportMappingCopyPlan(plan, (sql) =>
      executeImportMappingCopySql(
        'postgresql://postgres.zdeiezfoemibjgrkyzvs@localhost/postgres',
        sql,
      ),
    );
    expect(connect).toHaveBeenCalled();
    expect(query).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
  });
});