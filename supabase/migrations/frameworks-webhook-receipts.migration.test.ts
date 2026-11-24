import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
const db=new PGlite();const owner='0x'+'a'.repeat(40);const sha='a'.repeat(64);
beforeAll(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE streams(id integer PRIMARY KEY,stream_id text,playback_id text,creator_id text,is_live boolean,last_live_at timestamptz,updated_at timestamptz,save_recording boolean,name text,thumbnail_url text,requires_metoken boolean,metoken_price numeric);
 CREATE TABLE video_assets(id serial PRIMARY KEY,title text,asset_id text,playback_id text,category text,location text,description text,creator_id text,status text,duration numeric,views_count integer,likes_count integer,is_minted boolean,current_supply integer,thumbnail_url text NOT NULL DEFAULT '',source_type text,parent_playback_id text,requires_metoken boolean,metoken_price numeric,updated_at timestamptz DEFAULT now());
 GRANT ALL ON streams,video_assets TO service_role;GRANT USAGE ON SEQUENCE video_assets_id_seq TO service_role;
 ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon,authenticated,service_role;
 INSERT INTO streams VALUES(1,'parent','parent-play','${owner}',false,NULL,now(),true,'Creator stream',NULL,true,2);`);
 await db.exec(readFileSync(new URL('./20261123143443_frameworks_webhook_receipts.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('./20261123144030_frameworks_recording_thumbnail_fallback.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('./20261123051536_frameworks_asset_identity.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('./20261123053537_frameworks_vod_access.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('./20261124170039_frameworks_recording_authority.sql',import.meta.url),'utf8'));
},30000);
afterAll(()=>db.close());
const process=(id:string,type:string,time='2026-11-23T10:00:00Z',stream:string|null='parent',artifact:Record<string,unknown>|null=null,hash=sha)=>db.query<{process_frameworks_webhook:string}>('SELECT process_frameworks_webhook($1,$2,$3,$4,$5,$6)',[id,type,hash,time,stream,artifact]);
describe.sequential('atomic FrameWorks webhook receipts',()=>{
 it('processes once and rejects a conflicting payload under the same event ID',async()=>{
  expect((await process('live','stream.live')).rows[0].process_frameworks_webhook).toBe('processed');
  expect((await process('live','stream.live')).rows[0].process_frameworks_webhook).toBe('duplicate');
  await expect(process('live','stream.live',undefined,undefined,undefined,'b'.repeat(64))).rejects.toThrow(/conflict/);
 });
 it('keeps newer stream state when an older event arrives',async()=>{
  await process('idle','stream.idle','2026-11-23T10:01:00Z');
  expect((await process('old-live','stream.live','2026-11-23T09:59:00Z')).rows[0].process_frameworks_webhook).toBe('ignored');
  expect((await db.query('SELECT is_live FROM streams')).rows).toEqual([{is_live:false}]);
 });
 it('rolls back its receipt on missing stream and permits the same event to retry',async()=>{
  await expect(process('retry','stream.live',undefined,'missing')).rejects.toThrow(/not available/);
  expect((await db.query("SELECT count(*)::int AS count FROM frameworks_webhook_receipts WHERE event_id='retry'")).rows).toEqual([{count:0}]);
  expect((await process('retry','stream.live','2026-11-23T10:02:00Z')).rows[0].process_frameworks_webhook).toBe('processed');
 });
 it('stores a recording once across different event IDs, deriving its owner and gate from the stream',async()=>{
  const artifact={assetId:'recording',playbackId:'recording-play',durationSeconds:12,creator_id:'attacker',policyConfirmed:true};
  await process('record1','recording.ready',undefined,undefined,artifact);await process('record2','recording.ready',undefined,undefined,artifact);
  expect((await db.query('SELECT asset_id,creator_id,requires_metoken,metoken_price::text,thumbnail_url FROM video_assets')).rows).toEqual([{asset_id:'recording',creator_id:owner,requires_metoken:true,metoken_price:'2',thumbnail_url:''}]);
  expect((await db.query('SELECT asset_id,playback_id,creator_id,status,requires_metoken,metoken_price::text FROM frameworks_vod_access')).rows).toEqual([{asset_id:'recording',playback_id:'recording-play',creator_id:owner,status:'published',requires_metoken:true,metoken_price:'2'}]);
 });
 it('preserves catalog gate on first authority insert when parent later ungates',async()=>{
  await db.exec(`INSERT INTO video_assets(title,asset_id,playback_id,category,location,creator_id,status,duration,views_count,likes_count,is_minted,current_supply,thumbnail_url,source_type,parent_playback_id,requires_metoken,metoken_price)
    VALUES('Catalog recording','catalog-record','catalog-play','livestream','','${owner}','published',10,0,0,false,0,'','Livestream','parent-play',true,2)`);
  await db.exec('UPDATE streams SET requires_metoken=false,metoken_price=NULL');
  await process('catalog-ready','recording.ready',undefined,undefined,{assetId:'catalog-record',playbackId:'catalog-play',policyConfirmed:true});
  expect((await db.query("SELECT requires_metoken,metoken_price::text FROM frameworks_vod_access WHERE asset_id='catalog-record'")).rows).toEqual([{requires_metoken:true,metoken_price:'2'}]);
  expect((await db.query("SELECT requires_metoken,metoken_price::text FROM video_assets WHERE asset_id='catalog-record'")).rows).toEqual([{requires_metoken:true,metoken_price:'2'}]);
  await db.exec('UPDATE streams SET requires_metoken=true,metoken_price=2');
 });
 it('raises gate from parent when catalog row is ungated on first authority insert',async()=>{
  await db.exec(`INSERT INTO video_assets(title,asset_id,playback_id,category,location,creator_id,status,duration,views_count,likes_count,is_minted,current_supply,thumbnail_url,source_type,parent_playback_id,requires_metoken,metoken_price)
    VALUES('Ungated catalog','ungated-record','ungated-play','livestream','','${owner}','published',10,0,0,false,0,'','Livestream','parent-play',false,NULL)`);
  await db.exec('UPDATE streams SET requires_metoken=true,metoken_price=5');
  await process('ungated-ready','recording.ready',undefined,undefined,{assetId:'ungated-record',playbackId:'ungated-play',policyConfirmed:true});
  expect((await db.query("SELECT requires_metoken,metoken_price::text FROM frameworks_vod_access WHERE asset_id='ungated-record'")).rows).toEqual([{requires_metoken:true,metoken_price:'5'}]);
  expect((await db.query("SELECT requires_metoken,metoken_price::text FROM video_assets WHERE asset_id='ungated-record'")).rows).toEqual([{requires_metoken:true,metoken_price:'5'}]);
  await db.exec('UPDATE streams SET requires_metoken=true,metoken_price=2');
 });
 it('keeps the higher gated price when catalog and parent differ',async()=>{
  await db.exec(`INSERT INTO video_assets(title,asset_id,playback_id,category,location,creator_id,status,duration,views_count,likes_count,is_minted,current_supply,thumbnail_url,source_type,parent_playback_id,requires_metoken,metoken_price)
    VALUES('Lower catalog gate','higher-price-record','higher-price-play','livestream','','${owner}','published',10,0,0,false,0,'','Livestream','parent-play',true,2)`);
  await db.exec('UPDATE streams SET requires_metoken=true,metoken_price=5');
  await process('higher-price-ready','recording.ready',undefined,undefined,{assetId:'higher-price-record',playbackId:'higher-price-play',policyConfirmed:true});
  expect((await db.query("SELECT requires_metoken,metoken_price::text FROM frameworks_vod_access WHERE asset_id='higher-price-record'")).rows).toEqual([{requires_metoken:true,metoken_price:'5'}]);
  expect((await db.query("SELECT requires_metoken,metoken_price::text FROM video_assets WHERE asset_id='higher-price-record'")).rows).toEqual([{requires_metoken:true,metoken_price:'5'}]);
  await db.exec('UPDATE streams SET requires_metoken=true,metoken_price=2');
 });
 it('does not relax an existing recording gate when the parent changes or republish an archived recording',async()=>{
  await db.exec("UPDATE streams SET requires_metoken=false,metoken_price=NULL;UPDATE frameworks_vod_access SET status='archived' WHERE asset_id='recording'");
  await process('record3','recording.ready',undefined,undefined,{assetId:'recording',playbackId:'recording-play',policyConfirmed:true});
  expect((await db.query("SELECT status,requires_metoken,metoken_price::text FROM frameworks_vod_access WHERE asset_id='recording'")).rows).toEqual([{status:'archived',requires_metoken:true,metoken_price:'2'}]);
  expect((await db.query("SELECT provider,status,requires_metoken,frameworks_asset_id FROM video_assets WHERE asset_id='recording'")).rows).toEqual([{provider:'frameworks',status:'archived',requires_metoken:true,frameworks_asset_id:'recording'}]);
  await db.exec('UPDATE streams SET requires_metoken=true,metoken_price=2');
 });
 it('rolls back metadata and receipt rather than adopting conflicting playback authority',async()=>{
  await db.exec(`INSERT INTO frameworks_vod_access(asset_id,playback_id,creator_id) VALUES('conflicting-record','conflicting-play','0x${'b'.repeat(40)}')`);
  await expect(process('bad-record','recording.ready',undefined,undefined,{assetId:'conflicting-record',playbackId:'conflicting-play',policyConfirmed:true})).rejects.toThrow('authority conflict');
  expect((await db.query("SELECT count(*)::int AS count FROM video_assets WHERE asset_id='conflicting-record'")).rows).toEqual([{count:0}]);expect((await db.query("SELECT count(*)::int AS count FROM frameworks_webhook_receipts WHERE event_id='bad-record'")).rows).toEqual([{count:0}]);
 });
 it('rejects an enabled recording without server-confirmed provider protection before granting authority',async()=>{
  await expect(process('unprotected','recording.ready',undefined,undefined,{assetId:'unprotected-record',playbackId:'unprotected-play'})).rejects.toThrow('policy confirmation required');
  expect((await db.query("SELECT count(*)::int AS count FROM frameworks_vod_access WHERE asset_id='unprotected-record'")).rows).toEqual([{count:0}]);expect((await db.query("SELECT count(*)::int AS count FROM frameworks_webhook_receipts WHERE event_id='unprotected'")).rows).toEqual([{count:0}]);
 });
 it('preserves an upload observation before browser persistence without publishing or inventing ownership',async()=>{
  await process('upload','upload.ready',undefined,null,{assetId:'upload',playbackId:'upload-play',durationSeconds:7});
  expect((await db.query("SELECT count(*)::int AS count FROM video_assets WHERE asset_id='upload'")).rows).toEqual([{count:0}]);
  expect((await db.query("SELECT playback_id FROM frameworks_ready_artifacts WHERE asset_id='upload'")).rows).toEqual([{playback_id:'upload-play'}]);
 });
 it('does not acknowledge a conflicting artifact identity or failed database effect',async()=>{
  await expect(process('conflict','upload.ready',undefined,null,{assetId:'upload',playbackId:'different'})).rejects.toThrow(/Conflicting/);
  expect((await db.query("SELECT count(*)::int AS count FROM frameworks_webhook_receipts WHERE event_id='conflict'")).rows).toEqual([{count:0}]);
 });
 it('honors a creator decision not to save recordings',async()=>{
  await db.exec('UPDATE streams SET save_recording=false');
  expect((await process('no-record','recording.ready',undefined,undefined,{assetId:'no-record',playbackId:'no-record-play'})).rows[0].process_frameworks_webhook).toBe('ignored');
  expect((await db.query("SELECT count(*)::int AS count FROM video_assets WHERE asset_id='no-record'")).rows).toEqual([{count:0}]);
  expect((await db.query("SELECT count(*)::int AS count FROM frameworks_vod_access WHERE asset_id='no-record'")).rows).toEqual([{count:0}]);
 });
 it('keeps receipts and RPC inaccessible to public roles',async()=>{
  for(const role of ['anon','authenticated']){
   await db.exec(`SET ROLE ${role}`);try{await expect(process('forged','stream.live')).rejects.toThrow();await expect(db.query('SELECT * FROM frameworks_webhook_receipts')).rejects.toThrow();}finally{await db.exec('RESET ROLE');}
  }
 });
});
