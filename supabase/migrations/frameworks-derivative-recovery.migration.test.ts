import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Applies the derivative-recovery migration to a database that already holds a
 * ready *legacy* recovery — the state the QA database is in — and then exercises
 * the derivative path.
 */
const db = new PGlite();
const legacySource = 'bd18c602-9323-4b6e-aa90-7f8e8065e416';
const derivativeSource = 'fac7fe31-599d-405e-90d1-b406b08d728a';
const derivativeSha = 'b'.repeat(64);
const originalSha = 'a'.repeat(64);
const reviewer = '0x' + 'a'.repeat(40);

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE frameworks_asset_imports(
      livepeer_asset_id uuid PRIMARY KEY, livepeer_playback_id text, source_sha256 text,
      source_bytes bigint, state text, frameworks_asset_id text, frameworks_playback_id text,
      updated_at timestamptz);
    CREATE TABLE video_assets(id bigint, asset_id text, playback_id text);
    CREATE TABLE frameworks_vod_access(asset_id text, playback_id text);
    GRANT SELECT,INSERT,UPDATE ON frameworks_asset_imports,video_assets,frameworks_vod_access TO service_role;
    INSERT INTO frameworks_asset_imports VALUES
      ('${legacySource}','bd18hlmb6vazgsy8','ab4ea28fdac612cf2f1f588ace9691683ac85fe3e9c84193e0e0c044a111313e',
       160998594,'ready','legacy-new','legacy-new-play',now()),
      ('${derivativeSource}','lp-tulleti','${originalSha}',237282639,'failed','orig-asset','orig-play',now());
  `);
  // Pre-migration shape, including the pre-transfer recovery flow.
  await db.exec(readFileSync(new URL('./20261124183930_frameworks_import_reconciliation.sql', import.meta.url), 'utf8'));
  // The row the QA database already has: a ready recovery with no derivative data.
  await db.exec(`
    INSERT INTO frameworks_import_recoveries(
      livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,original_asset_id,original_playback_id,
      state,frameworks_asset_id,frameworks_playback_id,reason,reviewed_by,adopted_at)
    VALUES('${legacySource}','bd18hlmb6vazgsy8',
      'ab4ea28fdac612cf2f1f588ace9691683ac85fe3e9c84193e0e0c044a111313e',160998594,
      'bd18hlmb6vazgsy8','bd18hlmb6vazgsy8','ready','legacy-new','legacy-new-play','pre-transfer recovery','${reviewer}',now());
  `);
  // The migration under test.
  await db.exec(readFileSync(new URL('./20261126093000_frameworks_derivative_recovery.sql', import.meta.url), 'utf8'));
}, 60000);

afterAll(() => db.close());

describe.sequential('derivative recovery migration', () => {
  it('applies over an existing ready legacy recovery and preserves it', async () => {
    const row = await db.query<{ state: string; recovery_kind: string; derivative_sha256: string | null; adopted_at: string | null }>(
      `SELECT state,recovery_kind,derivative_sha256,adopted_at FROM frameworks_import_recoveries WHERE livepeer_asset_id=$1`,
      [legacySource],
    );
    expect(row.rows).toEqual([
      { state: 'ready', recovery_kind: 'legacy', derivative_sha256: null, adopted_at: expect.any(String) },
    ]);
  });

  it('still lets a legacy recovery become ready without derivative evidence', async () => {
    // Inserted directly to prove the constraint permits it, exactly as before the migration.
    await db.exec(`
      INSERT INTO frameworks_asset_imports VALUES
        ('11111111-1111-4111-8111-111111111111','lp-legacy-2','${'c'.repeat(64)}',10,'ambiguous','l2-orig','l2-orig-play',now());
      INSERT INTO frameworks_import_recoveries(
        livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,original_asset_id,original_playback_id,
        state,frameworks_asset_id,frameworks_playback_id,reason,reviewed_by)
      VALUES('11111111-1111-4111-8111-111111111111','lp-legacy-2','${'c'.repeat(64)}',10,'l2-orig','l2-orig-play',
        'ready','l2-new','l2-new-play','legacy path','${reviewer}');
    `);
    const row = await db.query<{ recovery_kind: string }>(
      `SELECT recovery_kind FROM frameworks_import_recoveries WHERE livepeer_asset_id='11111111-1111-4111-8111-111111111111'`,
    );
    expect(row.rows[0].recovery_kind).toBe('legacy');
  });

  it('refuses a derivative recovery that is ready without derivative evidence', async () => {
    await expect(db.exec(`
      INSERT INTO frameworks_import_recoveries(
        livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,original_asset_id,original_playback_id,
        state,frameworks_asset_id,frameworks_playback_id,reason,reviewed_by,recovery_kind)
      VALUES('${derivativeSource}','lp-tulleti','${originalSha}',237282639,'orig-asset','orig-play',
        'ready','d-new','d-new-play','no evidence','${reviewer}','derivative');
    `)).rejects.toThrow(/recovery_ready_needs_derivative|violates check constraint/i);
  });

  it('records derivative evidence for a failed import', async () => {
    await db.query(
      `SELECT prepare_reviewed_derivative_recovery($1,$2,$3,$4,$5,$6,$7,$8)`,
      [derivativeSource, reviewer, originalSha, 237282639, derivativeSha, 630109556, 'transcode:h264-8bit', 'AV1 not ingested'],
    );
    const row = await db.query<Record<string, unknown>>(
      `SELECT recovery_kind,derivative_sha256,derivative_bytes,state,original_asset_id
       FROM frameworks_import_recoveries WHERE livepeer_asset_id=$1`,
      [derivativeSource],
    );
    expect(row.rows[0]).toMatchObject({
      recovery_kind: 'derivative',
      derivative_sha256: derivativeSha,
      derivative_bytes: '630109556',
      state: 'prepared',
      original_asset_id: 'orig-asset',
    });
  });

  it('rejects evidence that does not match the quarantined attempt', async () => {
    await expect(db.query(
      `SELECT prepare_reviewed_derivative_recovery($1,$2,$3,$4,$5,$6,$7,$8)`,
      [derivativeSource, reviewer, 'd'.repeat(64), 237282639, 'e'.repeat(64), 630109556, 'transcode', 'x'],
    )).rejects.toThrow(/Original attempt evidence differs/i);
  });

  it('refuses to convert a source that already has a legacy recovery', async () => {
    await expect(db.query(
      `SELECT prepare_reviewed_derivative_recovery($1,$2,$3,$4,$5,$6,$7,$8)`,
      [legacySource, reviewer, 'ab4ea28fdac612cf2f1f588ace9691683ac85fe3e9c84193e0e0c044a111313e', 160998594,
        'f'.repeat(64), 1, 'transcode', 'x'],
    )).rejects.toThrow();
  });

  it('adopts only once the replacement is ready', async () => {
    await expect(db.query(`SELECT adopt_reviewed_derivative_recovery($1)`, [derivativeSource]))
      .rejects.toThrow(/Replacement is not ready/i);

    await db.exec(`
      UPDATE frameworks_import_recoveries
      SET state='ready',frameworks_asset_id='d-new',frameworks_playback_id='d-new-play'
      WHERE livepeer_asset_id='${derivativeSource}';
    `);
    await db.query(`SELECT adopt_reviewed_derivative_recovery($1)`, [derivativeSource]);

    const source = await db.query<{ state: string; frameworks_asset_id: string }>(
      `SELECT state,frameworks_asset_id FROM frameworks_asset_imports WHERE livepeer_asset_id=$1`,
      [derivativeSource],
    );
    expect(source.rows[0]).toEqual({ state: 'ready', frameworks_asset_id: 'd-new' });

    // Idempotent: a repeat call returns without changing anything.
    await db.query(`SELECT adopt_reviewed_derivative_recovery($1)`, [derivativeSource]);
    const recovery = await db.query<{ adopted_at: string | null }>(
      `SELECT adopted_at FROM frameworks_import_recoveries WHERE livepeer_asset_id=$1`,
      [derivativeSource],
    );
    expect(recovery.rows[0].adopted_at).toEqual(expect.any(String));
  });

  it('refuses to adopt a legacy recovery through the derivative RPC', async () => {
    await expect(db.query(`SELECT adopt_reviewed_derivative_recovery($1)`, [legacySource]))
      .rejects.toThrow(/Not a derivative recovery|quarantined/i);
  });
});
