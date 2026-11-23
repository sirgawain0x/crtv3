import {PGlite} from '@electric-sql/pglite';
import {describe,expect,it} from 'vitest';
import {buildAssetCutoverPlan,renderAssetCutoverSql,type AccessVideoSnapshot} from './cutover-plan';
const creator='0x'+'a'.repeat(40),id='2499b6b6-314f-4251-b119-fbb6445a48a5',hash='a'.repeat(64);
const video:AccessVideoSnapshot={id:1,asset_id:id,playback_id:'old-play',status:'published',creator_id:creator,requires_metoken:true,metoken_price:'2.00000001'};
const input={videos:[video],references:[],archive:[{assetId:id,playbackId:'old-play',sha256:hash,sizeBytes:123}],mappings:[{livepeer_asset_id:id,livepeer_playback_id:'old-play',frameworks_asset_id:'new-asset',frameworks_playback_id:'new-play',source_sha256:hash,source_bytes:123,state:'ready' as const}]};
async function fixture(){
 const db=new PGlite();await db.exec(`CREATE TABLE video_assets(id integer PRIMARY KEY,asset_id text,playback_id text,provider text,livepeer_asset_id text,livepeer_playback_id text,frameworks_asset_id text,frameworks_playback_id text,parent_playback_id text,creator_id text,status text,requires_metoken boolean,metoken_price numeric,title text);
 CREATE TABLE metoken_transactions(id text PRIMARY KEY,playback_id text);
 CREATE TABLE frameworks_asset_imports(livepeer_asset_id uuid,state text,frameworks_asset_id text,frameworks_playback_id text,source_sha256 text,source_bytes bigint);
 CREATE TABLE frameworks_vod_access(asset_id text PRIMARY KEY,playback_id text UNIQUE,creator_id text,status text,requires_metoken boolean,metoken_price numeric);
 INSERT INTO video_assets(id,asset_id,playback_id,creator_id,status,requires_metoken,metoken_price,title) VALUES(1,'${id}','old-play','${creator}','published',true,2.00000001,'Original');
 INSERT INTO frameworks_asset_imports VALUES('${id}','ready','new-asset','new-play','${hash}',123);`);return db;
}
describe('creator/payment-preserving cutover plan',()=>{
 it('blocks missing creator or ambiguous payment evidence',()=>{
  for(const change of [{creator_id:'unknown'},{requires_metoken:undefined},{metoken_price:undefined},{metoken_price:-1}]){
   const plan=buildAssetCutoverPlan({...input,videos:[{...video,...change} as AccessVideoSnapshot]});expect(()=>renderAssetCutoverSql(plan,'apply')).toThrow(/creator/);
  }
 });
 it('seeds the exact original owner and gate atomically, repeats safely, and retains authority on rollback',async()=>{
  const db=await fixture();try{
   const plan=buildAssetCutoverPlan(input);await db.exec(renderAssetCutoverSql(plan,'apply'));await db.exec(renderAssetCutoverSql(plan,'apply'));
   expect((await db.query('SELECT creator_id,status,requires_metoken,metoken_price::text FROM frameworks_vod_access')).rows).toEqual([{creator_id:creator,status:'published',requires_metoken:true,metoken_price:'2.00000001'}]);
   await db.exec("UPDATE video_assets SET title='New title'");await db.exec(renderAssetCutoverSql(plan,'rollback'));
   expect((await db.query('SELECT asset_id,title FROM video_assets')).rows).toEqual([{asset_id:id,title:'New title'}]);
   expect((await db.query('SELECT count(*)::int AS count FROM frameworks_vod_access')).rows).toEqual([{count:1}]);
  }finally{await db.close();}
 },30000);
 it('rolls back the remap if a gate changed after the snapshot',async()=>{
  const db=await fixture();try{
   await db.exec('UPDATE video_assets SET metoken_price=3');await expect(db.exec(renderAssetCutoverSql(buildAssetCutoverPlan(input),'apply'))).rejects.toThrow();await db.exec('ROLLBACK');
   expect((await db.query('SELECT asset_id FROM video_assets')).rows).toEqual([{asset_id:id}]);expect((await db.query('SELECT count(*)::int AS count FROM frameworks_vod_access')).rows).toEqual([{count:0}]);
  }finally{await db.close();}
 },30000);
 it('keeps reviewed historical references unchanged and guards against later drift',async()=>{
  const db=await fixture();try{
   await db.exec("INSERT INTO metoken_transactions VALUES('historical','retired-play')");
   const ref={table:'metoken_transactions' as const,id:'historical',values:{playback_id:'retired-play'}};
   const plan=buildAssetCutoverPlan({...input,references:[ref],preserveReferences:[{table:ref.table,id:ref.id,field:'playback_id',value:'retired-play',reason:'Historical payment reference without an active source; preserve unchanged.'}]});
   await db.exec("UPDATE metoken_transactions SET playback_id='changed'");
   await expect(db.exec(renderAssetCutoverSql(plan,'apply'))).rejects.toThrow();await db.exec('ROLLBACK');
   expect((await db.query('SELECT asset_id FROM video_assets')).rows).toEqual([{asset_id:id}]);
   await db.exec("UPDATE metoken_transactions SET playback_id='retired-play'");await db.exec(renderAssetCutoverSql(plan,'apply'));
   expect((await db.query('SELECT playback_id FROM metoken_transactions')).rows).toEqual([{playback_id:'retired-play'}]);
  }finally{await db.close();}
 },30000);
 it('does not overwrite a conflicting existing playback authority record',async()=>{
  const db=await fixture();try{
   await db.exec(`INSERT INTO frameworks_vod_access VALUES('new-asset','new-play','${creator}','published',false,NULL)`);
   await expect(db.exec(renderAssetCutoverSql(buildAssetCutoverPlan(input),'apply'))).rejects.toThrow();await db.exec('ROLLBACK');
   expect((await db.query('SELECT asset_id FROM video_assets')).rows).toEqual([{asset_id:id}]);
  }finally{await db.close();}
 },30000);
});
