import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const source = '51e1d8ff-d3ae-4f0a-918c-e0dfea796f1b';

beforeAll(async () => {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE frameworks_asset_imports(
      livepeer_asset_id uuid PRIMARY KEY,
      livepeer_playback_id text,
      source_sha256 text,
      source_bytes bigint,
      state text,
      frameworks_asset_id text,
      frameworks_playback_id text,
      updated_at timestamptz
    );
    GRANT SELECT,INSERT,UPDATE ON frameworks_asset_imports TO service_role;
    INSERT INTO frameworks_asset_imports VALUES(
      '${source}','play','${'a'.repeat(64)}',100,'failed','old-asset','old-play',now()
    );`);
  await db.exec(readFileSync(new URL('./20261125143000_frameworks_failed_import_retry.sql', import.meta.url), 'utf8'));
}, 30000);

afterAll(() => db.close());

describe('failed import retry migration', () => {
  it('resets only failed rows with matching evidence and refuses ready', async () => {
    await db.query('SELECT reset_frameworks_failed_import($1,$2,$3,$4)', [source, 'play', 'a'.repeat(64), 100]);
    expect((await db.query('SELECT state,frameworks_asset_id FROM frameworks_asset_imports')).rows).toEqual([
      { state: 'prepared', frameworks_asset_id: null },
    ]);
    await db.query('SELECT reset_frameworks_failed_import($1,$2,$3,$4)', [source, 'play', 'a'.repeat(64), 100]);
    expect((await db.query('SELECT failed_attempt_history FROM frameworks_asset_imports')).rows).toEqual([
      { failed_attempt_history: [expect.objectContaining({ asset_id: 'old-asset', playback_id: 'old-play' })] },
    ]);
    await db.exec("UPDATE frameworks_asset_imports SET state='ready',frameworks_asset_id='new',frameworks_playback_id='new-play'");
    await expect(db.query('SELECT reset_frameworks_failed_import($1,$2,$3,$4)', [source, 'play', 'a'.repeat(64), 100])).rejects.toThrow(/Ready/);
  });

  it('rejects URL-bearing failure reasons at the database boundary', async () => {
    await expect(db.exec("UPDATE frameworks_asset_imports SET provider_failure_reason='see https://evil'")).rejects.toThrow();
    await db.exec("UPDATE frameworks_asset_imports SET provider_failure_reason='transcode_failed',provider_failure_phase='failed'");
    expect((await db.query('SELECT provider_failure_reason FROM frameworks_asset_imports')).rows).toEqual([
      { provider_failure_reason: 'transcode_failed' },
    ]);
  });
});