import {PGlite} from '@electric-sql/pglite';
import {describe,expect,it} from 'vitest';
import {buildAssetCutoverPlan,renderAssetCutoverSql,type AccessVideoSnapshot} from './cutover-plan';
import type {PublishedPlaybackException} from './published-exceptions';
import type {ReadyAssetMapping,VideoIdentityRow} from './remap-plan';

// Needs @electric-sql/pglite, which is installed in CI and not in the local symlinked
// node_modules; this file is the only verifier of the SQL guard's runtime behaviour.
const creator='0x'+'a'.repeat(40),hash='a'.repeat(64);
const id=(n:number)=>`0000000${n}-1111-4111-8111-111111111111`;
const legacy=(n:number):VideoIdentityRow=>({id:n,asset_id:id(n),playback_id:`old-play-${n}`,status:'published',creator_id:creator,requires_metoken:false,metoken_price:0} as VideoIdentityRow);
const mapping=(n:number):ReadyAssetMapping=>({livepeer_asset_id:id(n),livepeer_playback_id:`old-play-${n}`,frameworks_asset_id:`new-asset-${n}`,frameworks_playback_id:`new-play-${n}`,source_sha256:hash,source_bytes:123,state:'ready'});
const exception=(n:number,label:string):PublishedPlaybackException=>({videoId:n,legacyAssetId:id(n),legacyPlaybackId:`old-play-${n}`,label,reason:'import failed at the provider; recovery tracked separately'});

describe('published exception SQL guard',()=>{
 it('aborts the cutover if an excepted row gains a mapping after the snapshot',async()=>{
  const db=new PGlite();
  try{
   await db.exec(`CREATE TABLE video_assets(id integer PRIMARY KEY,asset_id text,playback_id text,provider text,livepeer_asset_id text,livepeer_playback_id text,frameworks_asset_id text,frameworks_playback_id text,parent_playback_id text,creator_id text,status text,requires_metoken boolean,metoken_price numeric);
    CREATE TABLE metoken_transactions(id text PRIMARY KEY,playback_id text);
    CREATE TABLE frameworks_asset_imports(livepeer_asset_id uuid,state text,frameworks_asset_id text,frameworks_playback_id text,source_sha256 text,source_bytes bigint);
    CREATE TABLE frameworks_vod_access(asset_id text PRIMARY KEY,playback_id text UNIQUE,creator_id text,status text,requires_metoken boolean,metoken_price numeric);
    INSERT INTO video_assets(id,asset_id,playback_id,creator_id,status,requires_metoken,metoken_price) VALUES(1,'${id(1)}','old-play-1','${creator}','published',false,0);
    INSERT INTO video_assets(id,asset_id,playback_id,creator_id,status,requires_metoken,metoken_price) VALUES(10,'${id(10)}','old-play-10','${creator}','published',false,0);
    INSERT INTO frameworks_asset_imports VALUES('${id(1)}','ready','new-asset-1','new-play-1','${hash}',123);`);
   const videos=[legacy(1),legacy(10)] as AccessVideoSnapshot[];
   const plan=buildAssetCutoverPlan({videos,references:[],mappings:[mapping(1)],archive:[{assetId:id(1),playbackId:'old-play-1',sha256:hash,sizeBytes:123}],publishedExceptions:[exception(10,'Monster')]});
   const sql=renderAssetCutoverSql(plan,'apply');
   await db.exec(sql); // passes while the excepted row is still unmapped
   expect((await db.query("SELECT provider FROM video_assets WHERE id=1")).rows).toEqual([{provider:'frameworks'}]);
   // a late mapping on the excepted row means the reviewed exception no longer holds
   await db.exec(`UPDATE video_assets SET asset_id='late-asset',playback_id='late-play',provider='frameworks' WHERE id=10`);
   await expect(db.exec(sql)).rejects.toThrow();
   await db.exec('ROLLBACK');
  }finally{await db.close();}
 },30000);
});
