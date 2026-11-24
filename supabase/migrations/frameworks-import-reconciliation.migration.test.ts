import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
const db=new PGlite();const source='bd18c602-9323-4b6e-aa90-7f8e8065e416',reviewer='0x'+'a'.repeat(40);
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE frameworks_asset_imports(livepeer_asset_id uuid PRIMARY KEY,livepeer_playback_id text,source_sha256 text,source_bytes bigint,state text,frameworks_asset_id text,frameworks_playback_id text,updated_at timestamptz);
 CREATE TABLE video_assets(asset_id text,playback_id text);CREATE TABLE frameworks_vod_access(asset_id text,playback_id text);
 GRANT SELECT,INSERT,UPDATE ON frameworks_asset_imports,video_assets,frameworks_vod_access TO service_role;
 INSERT INTO frameworks_asset_imports VALUES('${source}','bd18hlmb6vazgsy8','ab4ea28fdac612cf2f1f588ace9691683ac85fe3e9c84193e0e0c044a111313e',160998594,'ambiguous','202611241631464302d8bfdb5ddbae','mBdbNNDWgTBDqQfu',now());`);
 await db.exec(readFileSync(new URL('./20261124183930_frameworks_import_reconciliation.sql',import.meta.url),'utf8'));
},30000);
afterAll(()=>db.close());
const prepare=()=>db.query('SELECT prepare_reviewed_frameworks_recovery($1)',[reviewer]);
const adopt=()=>db.query('SELECT adopt_verified_frameworks_recovery($1)',[source]);
describe.sequential('reviewed pre-transfer recovery',()=>{
 it('reserves one separate attempt without resetting or deleting the original',async()=>{
  await prepare();await prepare();
  expect((await db.query('SELECT state,frameworks_asset_id FROM frameworks_asset_imports')).rows).toEqual([{state:'ambiguous',frameworks_asset_id:'202611241631464302d8bfdb5ddbae'}]);
  expect((await db.query('SELECT state,original_asset_id,reviewed_by FROM frameworks_import_recoveries')).rows).toEqual([{state:'prepared',original_asset_id:'202611241631464302d8bfdb5ddbae',reviewed_by:reviewer}]);
 });
 it('rejects changed source evidence and preserves immutable audit fields',async()=>{
  await db.exec("UPDATE frameworks_asset_imports SET source_bytes=1");await expect(prepare()).rejects.toThrow(/evidence/);await db.exec('UPDATE frameworks_asset_imports SET source_bytes=160998594');
  await expect(db.exec("UPDATE frameworks_import_recoveries SET original_asset_id='different'")).rejects.toThrow(/immutable/);
  await expect(db.exec("UPDATE frameworks_import_recoveries SET source_sha256='forged'")).rejects.toThrow(/immutable/);
 });
 it('rejects unfinished replacements and retains the first replacement identity',async()=>{
  await expect(adopt()).rejects.toThrow(/readiness/);
  await db.exec("UPDATE frameworks_import_recoveries SET state='processing',frameworks_asset_id='replacement',frameworks_playback_id='replacement-play'");
  await expect(db.exec("UPDATE frameworks_import_recoveries SET frameworks_asset_id='another'")).rejects.toThrow(/immutable/);
  await expect(adopt()).rejects.toThrow(/readiness/);
 });
 it('refuses to replace an original target already used by the application',async()=>{
  await db.exec("UPDATE frameworks_import_recoveries SET state='ready';INSERT INTO frameworks_vod_access VALUES('202611241631464302d8bfdb5ddbae','mBdbNNDWgTBDqQfu')");
  await expect(adopt()).rejects.toThrow(/quarantined/);await db.exec('DELETE FROM frameworks_vod_access');
 });
 it('adopts a verified replacement atomically and retains both identities on repeated adoption',async()=>{
  await adopt();await adopt();
  expect((await db.query('SELECT state,frameworks_asset_id,frameworks_playback_id FROM frameworks_asset_imports')).rows).toEqual([{state:'ready',frameworks_asset_id:'replacement',frameworks_playback_id:'replacement-play'}]);
  expect((await db.query('SELECT original_asset_id,frameworks_asset_id,adopted_at IS NOT NULL AS adopted FROM frameworks_import_recoveries')).rows).toEqual([{original_asset_id:'202611241631464302d8bfdb5ddbae',frameworks_asset_id:'replacement',adopted:true}]);
  await expect(prepare()).rejects.toThrow(/evidence/);
 });
 it('denies public recovery calls, public audit reads and runtime deletion',async()=>{
  expect((await db.query(`SELECT relrowsecurity AS rls,has_table_privilege('anon',oid,'SELECT') AS public_read,has_table_privilege('service_role',oid,'DELETE') AS runtime_delete FROM pg_class WHERE oid='frameworks_import_recoveries'::regclass`)).rows).toEqual([{rls:true,public_read:false,runtime_delete:false}]);
  expect((await db.query(`SELECT has_function_privilege('anon','prepare_reviewed_frameworks_recovery(text)','EXECUTE') AS prepare,has_function_privilege('authenticated','adopt_verified_frameworks_recovery(uuid)','EXECUTE') AS adopt`)).rows).toEqual([{prepare:false,adopt:false}]);
 });
});
