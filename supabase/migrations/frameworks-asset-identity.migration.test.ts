import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const db = new PGlite();
const sql = readFileSync(new URL('./20261123051536_frameworks_asset_identity.sql', import.meta.url), 'utf8');
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    CREATE TABLE video_assets(id integer PRIMARY KEY, asset_id text, playback_id text);
    CREATE TABLE streams(id integer PRIMARY KEY, stream_id text, playback_id text, stream_key text);
    REVOKE ALL ON streams FROM anon, authenticated;
    GRANT SELECT(id,stream_id,playback_id) ON streams TO anon, authenticated;
    INSERT INTO video_assets VALUES(1,'old-asset','old-playback');
    INSERT INTO streams VALUES(1,'old-stream','old-playback','private-key');`);
  await db.exec(sql);
  await db.exec(sql);
}, 30000);
afterAll(async () => { await db.close(); });
describe.sequential('additive FrameWorks identities', () => {
  it('is idempotent and preserves original IDs without guessing the old provider', async () => {
    expect((await db.query('SELECT asset_id,playback_id,provider,livepeer_asset_id,frameworks_asset_id FROM video_assets')).rows).toEqual([
      { asset_id: 'old-asset', playback_id: 'old-playback', provider: null, livepeer_asset_id: null, frameworks_asset_id: null },
    ]);
    expect((await db.query('SELECT stream_id,playback_id FROM streams')).rows).toEqual([{ stream_id:'old-stream', playback_id:'old-playback' }]);
  });
  it('does not expose existing stream keys through additive columns', async () => {
    const { rows } = await db.query(`SELECT has_column_privilege('anon','streams','stream_key','SELECT') AS anonymous_key,
      has_column_privilege('authenticated','streams','stream_key','SELECT') AS user_key`);
    expect(rows).toEqual([{ anonymous_key:false, user_key:false }]);
  });
  it('enables RLS and revokes inherited broad grants on the import ledger', async () => {
    const { rows } = await db.query(`SELECT relrowsecurity AS rls,
      has_table_privilege('anon',oid,'SELECT') AS anon_read,
      has_table_privilege('authenticated',oid,'INSERT') AS user_insert,
      has_table_privilege('service_role',oid,'SELECT') AS server_read,
      has_table_privilege('service_role',oid,'INSERT') AS server_insert,
      has_table_privilege('service_role',oid,'UPDATE') AS server_update,
      has_table_privilege('service_role',oid,'DELETE') AS server_delete
      FROM pg_class WHERE oid='public.frameworks_asset_imports'::regclass`);
    expect(rows).toEqual([{ rls:true, anon_read:false, user_insert:false, server_read:true, server_insert:true, server_update:true, server_delete:false }]);
  });
  it('reserves each source once and cannot mark an asset ready without its new identities', async () => {
    const values = ['2499b6b6-314f-4251-b119-fbb6445a48a5', 'a'.repeat(64), 63405447];
    const insert = `INSERT INTO frameworks_asset_imports(livepeer_asset_id,source_sha256,source_bytes) VALUES($1,$2,$3)`;
    await db.query(insert, values);
    await expect(db.query(insert, values)).rejects.toThrow();
    await expect(db.query("UPDATE frameworks_asset_imports SET state='ready'")).rejects.toThrow();
    await db.exec("UPDATE frameworks_asset_imports SET state='ambiguous'");
    expect((await db.query('SELECT state FROM frameworks_asset_imports')).rows).toEqual([{ state:'ambiguous' }]);
  });
  it('keeps reservations undeletable by the runtime service role', async () => {
    await db.exec('SET ROLE service_role');
    try { await expect(db.exec('DELETE FROM frameworks_asset_imports')).rejects.toThrow(); }
    finally { await db.exec('RESET ROLE'); }
  });
});
