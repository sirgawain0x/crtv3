import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
const db=new PGlite();const parent='0x'+'a'.repeat(40),owner='0x'+'b'.repeat(40),stream='11111111-1111-4111-8111-111111111111';
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE streams(id uuid PRIMARY KEY,provider text,playback_id text,creator_id text,requires_metoken boolean,metoken_price numeric,allow_clipping boolean,thumbnail_url text,story_ip_id text);
 CREATE TABLE video_assets(id serial PRIMARY KEY,title text,asset_id text UNIQUE,playback_id text,category text,location text,creator_id text,status text,duration numeric,views_count integer,likes_count integer,is_minted boolean,current_supply integer,thumbnail_url text,source_type text,parent_playback_id text,parent_story_ip_id text,clip_start_ms bigint,clip_end_ms bigint,clipper_address text,requires_metoken boolean,metoken_price numeric,provider text,frameworks_asset_id text,frameworks_playback_id text,updated_at timestamptz);
 GRANT ALL ON streams,video_assets TO service_role;GRANT USAGE ON SEQUENCE video_assets_id_seq TO service_role;
 INSERT INTO streams VALUES('${stream}','frameworks','parent-play','${parent}',true,2,true,'','parent-ip');`);
 for(const file of ['20261123053537_frameworks_vod_access.sql','20261124182629_frameworks_clip_authority.sql']) await db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));
},30000);
afterAll(()=>db.close());
const register=(asset='clip',gate=true,price:number|null=2)=>db.query('SELECT register_frameworks_clip($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[asset,asset+'-play',owner,stream,'parent-play',parent,gate,price,'Clip',1000,11000]);
describe.sequential('clip ownership and inherited access',()=>{
 it('registers the clip owner separately from the broadcaster gate and derives Story metadata',async()=>{
  await register();expect((await db.query('SELECT creator_id,gate_creator_id,status,requires_metoken,metoken_price::text FROM frameworks_vod_access')).rows).toEqual([{creator_id:owner,gate_creator_id:parent,status:'draft',requires_metoken:true,metoken_price:'2'}]);
  expect((await db.query('SELECT parent_story_ip_id,clipper_address FROM video_assets')).rows).toEqual([{parent_story_ip_id:'parent-ip',clipper_address:owner}]);
 });
 it('rejects stale parent gates and disabled clipping without granting authority',async()=>{
  await expect(register('stale',false,0)).rejects.toThrow(/changed/);
  await db.exec('UPDATE streams SET allow_clipping=false');await expect(register('disabled')).rejects.toThrow(/changed/);await db.exec('UPDATE streams SET allow_clipping=true');
  expect((await db.query('SELECT count(*)::int AS count FROM frameworks_vod_access')).rows).toEqual([{count:1}]);
 });
 it('locks inherited policy in draft and published states',async()=>{
  await expect(db.query('SELECT update_frameworks_vod_access(1,$1,NULL,false,0,true)',[owner])).rejects.toThrow(/immutable/);
  await db.query("SELECT update_frameworks_vod_access(1,$1,'published',NULL,NULL,false)",[owner]);
  await expect(db.query("SELECT update_frameworks_vod_access(1,$1,'draft',NULL,NULL,false)",[owner])).rejects.toThrow(/immutable/);
 });
 it('cannot overwrite ownership or grant public registration access',async()=>{
  await expect(register()).rejects.toThrow();
  expect((await db.query(`SELECT has_function_privilege('anon','register_frameworks_clip(text,text,text,uuid,text,text,boolean,numeric,text,bigint,bigint)','EXECUTE') AS allowed`)).rows).toEqual([{allowed:false}]);
 });
});
