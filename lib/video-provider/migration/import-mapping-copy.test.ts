import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import {
  assertProdImportSupabaseUrl,
  assertQaMigrationSupabaseUrl,
  buildImportMappingCopyPlan,
  parseImportLedgerRows,
  readyMappingFromRow,
  renderImportMappingCopySql,
  type ImportLedgerRow,
} from './import-mapping-copy';

const sourceId = '2499b6b6-314f-4251-b119-fbb6445a48a5';
const sourceId2 = '3510c7c7-5262-4362-8220-0cc7556b59b6';

function readyRow(
  id: string,
  overrides: Partial<ImportLedgerRow> = {},
): ImportLedgerRow {
  return {
    livepeer_asset_id: id,
    livepeer_playback_id: `${id.slice(0, 8)}-play`,
    source_sha256: 'a'.repeat(64),
    source_bytes: 123,
    state: 'ready',
    frameworks_asset_id: `fw-asset-${id.slice(0, 8)}`,
    frameworks_playback_id: `fw-play-${id.slice(0, 8)}`,
    ...overrides,
  };
}

describe('import mapping copy planning', () => {
  it('counts ready, skipped, identical and conflict rows', () => {
    const source = [
      readyRow(sourceId),
      readyRow(sourceId2),
      { ...readyRow(sourceId), state: 'failed' as const, livepeer_asset_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
      { ...readyRow('6ba7b811-9dad-11d1-80b4-00c04fd430c8'), state: 'processing' as const },
    ];
    const target = [readyRow(sourceId)];
  const plan = buildImportMappingCopyPlan({ source, target });
    expect(plan.sourceReadyCount).toBe(2);
    expect(plan.sourceSkippedNonReady).toBe(2);
    expect(plan.plannedInserts).toBe(1);
    expect(plan.skippedIdentical).toBe(1);
    expect(plan.conflicts).toBe(0);
    expect(plan.executable).toBe(true);
  });

  it('refuses conflicting prod rows and duplicate frameworks identities', () => {
    const plan = buildImportMappingCopyPlan({
      source: [
        readyRow(sourceId),
        readyRow(sourceId2, {
          frameworks_asset_id: 'same-asset',
          frameworks_playback_id: 'same-play',
        }),
        readyRow('6ba7b812-9dad-11d1-80b4-00c04fd430c8', {
          frameworks_asset_id: 'same-asset',
          frameworks_playback_id: 'other-play',
        }),
      ],
      target: [
        readyRow(sourceId, {
          frameworks_asset_id: 'different-asset',
          frameworks_playback_id: 'different-play',
        }),
      ],
    });
    expect(plan.conflicts).toBeGreaterThanOrEqual(2);
    expect(plan.executable).toBe(false);
    expect(() => renderImportMappingCopySql(plan, 'apply')).toThrow(/conflict/);
  });

  it('validates ledger exports and migration database URLs', () => {
    expect(readyMappingFromRow(readyRow(sourceId))?.state).toBe('ready');
    expect(readyMappingFromRow({ ...readyRow(sourceId), state: 'failed' })).toBeNull();
    assertQaMigrationSupabaseUrl('https://zxpobpucayevlrzdxhmr.supabase.co');
    assertProdImportSupabaseUrl('https://zdeiezfoemibjgrkyzvs.supabase.co');
    expect(() => assertQaMigrationSupabaseUrl('https://zdeiezfoemibjgrkyzvs.supabase.co')).toThrow();
    expect(() => assertProdImportSupabaseUrl('https://zxpobpucayevlrzdxhmr.supabase.co')).toThrow();
    expect(parseImportLedgerRows([readyRow(sourceId)])).toHaveLength(1);
    expect(() => parseImportLedgerRows([{ livepeer_asset_id: 1 }])).toThrow();
  });
});

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

describe('import mapping copy SQL execution', () => {
  it('inserts idempotently and rolls back only copied rows', async () => {
    const db = await ledgerFixture();
    try {
      const source = [readyRow(sourceId), readyRow(sourceId2)];
      const plan = buildImportMappingCopyPlan({ source, target: [] });
      const apply = renderImportMappingCopySql(plan, 'apply');
      const rollback = renderImportMappingCopySql(plan, 'rollback');
      await db.exec(apply);
      await db.exec(apply);
      expect((await db.query('SELECT count(*)::int AS n FROM frameworks_asset_imports')).rows).toEqual([
        { n: 2 },
      ]);
      await db.exec(rollback);
      expect((await db.query('SELECT count(*)::int AS n FROM frameworks_asset_imports')).rows).toEqual([
        { n: 0 },
      ]);
    } finally {
      await db.close();
    }
  }, 30000);

  it('refuses apply when a target row drifted', async () => {
    const db = await ledgerFixture();
    try {
      const plan = buildImportMappingCopyPlan({
        source: [readyRow(sourceId)],
        target: [],
      });
      await db.query(
        `INSERT INTO frameworks_asset_imports VALUES($1,$2,$3,$4,'prepared',NULL,NULL,now(),now())`,
        [sourceId, 'old-play', 'a'.repeat(64), 123],
      );
      await expect(db.exec(renderImportMappingCopySql(plan, 'apply'))).rejects.toThrow();
      await db.exec('ROLLBACK');
      const rows = await db.query('SELECT state FROM frameworks_asset_imports');
      expect(rows.rows).toEqual([{ state: 'prepared' }]);
    } finally {
      await db.close();
    }
  }, 30000);
});