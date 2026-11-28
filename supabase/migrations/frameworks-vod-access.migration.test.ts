import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
const db=new PGlite();const owner='0x'+'a'.repeat(40);const other='0x'+'b'.repeat(40);
const sql=readFileSync(new URL('./20261123053537_frameworks_vod_access.sql',import.meta.url),'utf8');
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE video_assets(id integer PRIMARY KEY,asset_id text,playback_id text,creator_id text,status text,requires_metoken boolean,metoken_price numeric,updated_at timestamptz);
 GRANT ALL ON video_assets TO service_role;
 ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon,authenticated,service_role;
 INSERT INTO video_assets VALUES(1,'asset','play','${owner}','published',false,NULL,now());`);
 await db.exec(sql);await db.exec(sql);
 await db.exec(readFileSync(new URL("./20261123054045_frameworks_vod_policy_lock.sql",import.meta.url),"utf8"));
 await db.query('INSERT INTO frameworks_vod_access(asset_id,playback_id,creator_id) VALUES($1,$2,$3)',['asset','play',owner]);
},30000);
afterAll(()=>db.close());
describe.sequential('server-owned VOD authorization migration',()=>{
 it('defaults to draft independently of forged published metadata',async()=>{
  expect((await db.query('SELECT status FROM frameworks_vod_access')).rows).toEqual([{status:'draft'}]);
 });
 it('denies public reads, writes and RPC calls and runtime deletes',async()=>{
  expect((await db.query(`SELECT relrowsecurity AS rls,has_table_privilege('anon',oid,'SELECT') AS public_read,
   has_table_privilege('authenticated',oid,'UPDATE') AS user_write,has_table_privilege('service_role',oid,'DELETE') AS server_delete
   FROM pg_class WHERE oid='frameworks_vod_access'::regclass`)).rows).toEqual([{rls:true,public_read:false,user_write:false,server_delete:false}]);
  for(const role of ['anon','authenticated']) {
   await db.exec(`SET ROLE ${role}`);try{await expect(db.query('SELECT update_frameworks_vod_access($1,$2,$3,$4,$5,$6)',[1,owner,'published',true,1,true])).rejects.toThrow();}finally{await db.exec('RESET ROLE');}
  }
 });
 it('rejects wrong owners and mismatched provider identities',async()=>{
  await expect(db.query('SELECT update_frameworks_vod_access($1,$2,$3,$4,$5,$6)',[1,other,'published',false,0,true])).rejects.toThrow(/ownership/);
  await db.exec("UPDATE video_assets SET playback_id='forged'");
  await expect(db.query('SELECT update_frameworks_vod_access($1,$2,$3,$4,$5,$6)',[1,owner,'published',false,0,true])).rejects.toThrow(/ownership/);
  await db.exec("UPDATE video_assets SET playback_id='play'");
 });
 it('atomically publishes both records with the owner-authorized gate',async()=>{
  await db.exec('SET ROLE service_role');try{await db.query('SELECT update_frameworks_vod_access($1,$2,$3,$4,$5,$6)',[1,owner,'published',true,2,true]);}finally{await db.exec('RESET ROLE');}
  for(const table of ['video_assets','frameworks_vod_access']) expect((await db.query(`SELECT status,requires_metoken,metoken_price::text FROM ${table}`)).rows).toEqual([{status:'published',requires_metoken:true,metoken_price:'2'}]);
 });
 it('cannot relax a published gate or reset publication to draft using an older viewer token',async()=>{
  for(const args of [[1,owner,'published',false,0,true],[1,owner,'draft',null,null,false]]) {
   await expect(db.query('SELECT update_frameworks_vod_access($1,$2,$3,$4,$5,$6)',args)).rejects.toThrow(/immutable/);
  }
 });
 it('rolls back invalid access changes and preserves the authoritative gate after ordinary metadata tampering',async()=>{
  await expect(db.query('SELECT update_frameworks_vod_access($1,$2,$3,$4,$5,$6)',[1,owner,'published',false,-1,true])).rejects.toThrow();
  await db.exec('UPDATE video_assets SET requires_metoken=false,metoken_price=NULL');
  expect((await db.query('SELECT requires_metoken,metoken_price::text FROM frameworks_vod_access')).rows).toEqual([{requires_metoken:true,metoken_price:'2'}]);
 });
});
