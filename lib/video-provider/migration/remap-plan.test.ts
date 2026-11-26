import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { buildAssetRemapPlan, renderAssetRemapSql, type ReadyAssetMapping, type VideoIdentityRow } from './remap-plan';
const sourceId = '2499b6b6-314f-4251-b119-fbb6445a48a5';
const mapping: ReadyAssetMapping = { livepeer_asset_id:sourceId, livepeer_playback_id:'old-play', frameworks_asset_id:'artifact-hash', frameworks_playback_id:'new-play', source_sha256:'a'.repeat(64),source_bytes:123,state:'ready' };
const archive = [{ assetId:sourceId,playbackId:'old-play',sha256:mapping.source_sha256,sizeBytes:123 }];
const video: VideoIdentityRow = { id:1,asset_id:sourceId,playback_id:'old-play',status:'published' };
const makePlan = () => buildAssetRemapPlan({videos:[video],references:[{table:'metoken_transactions',id:'tx',values:{playback_id:'old-play'}}],mappings:[mapping],archive});
describe('FrameWorks remap planning', () => {
  it('preserves row identities and historical references without inventing mappings', () => {
    const plan = makePlan();
    expect(plan.blockers).toEqual([]); expect(plan.unresolvedReferences).toEqual([]);
    expect(plan.patches.map(p=>[p.table,p.id])).toEqual([['video_assets',1],['metoken_transactions','tx']]);
    expect(plan.patches[0].after.livepeer_asset_id).toBe(sourceId);
    expect(buildAssetRemapPlan({videos:[video,{...video,id:2,status:'draft'}],references:[],mappings:[],archive}).preservedDraftIds).toEqual([2]);
  });
  it('refuses unmapped published content, unknown historical references and unverified sources', () => {
    const plan = buildAssetRemapPlan({videos:[video],references:[],mappings:[],archive});
    expect(()=>renderAssetRemapSql(plan,'apply')).toThrow(/coverage/);
    const unknown = buildAssetRemapPlan({videos:[],references:[{table:'metoken_transactions',id:'tx',values:{playback_id:'unknown'}}],mappings:[mapping],archive});
    expect(()=>renderAssetRemapSql(unknown,'apply')).toThrow(/exceptions/);
    expect(()=>buildAssetRemapPlan({videos:[],references:[],mappings:[{...mapping,source_bytes:1}],archive})).toThrow(/archived source/);
    expect(()=>buildAssetRemapPlan({videos:[],references:[],mappings:[mapping,mapping],archive})).toThrow(/Duplicate/);
  });
  it('recognizes already migrated references and still repairs an old parent playback link', () => {
    const row = {...video,...makePlan().patches[0].after,parent_playback_id:'old-play'} as VideoIdentityRow;
    const plan=buildAssetRemapPlan({videos:[row],references:[{table:'metoken_transactions',id:'tx',values:{playback_id:'new-play'}}],mappings:[mapping],archive});
    expect(plan.unresolvedReferences).toEqual([]); expect(plan.patches).toHaveLength(1);
    expect(plan.patches[0].after.parent_playback_id).toBe('new-play');
    expect(buildAssetRemapPlan({videos:[{...row,parent_playback_id:'new-play'}],references:[],mappings:[mapping],archive}).patches).toEqual([]);
  });
  it('rejects column injection in a supplied plan', () => {
    const plan=makePlan(); plan.patches[0].after['title; DROP TABLE video_assets']= 'bad';
    expect(()=>renderAssetRemapSql(plan,'apply')).toThrow(/column/);
  });
});
async function fixture() {
  const db=new PGlite();
  await db.exec(`CREATE TABLE video_assets(id integer PRIMARY KEY,asset_id text,playback_id text,provider text,livepeer_asset_id text,livepeer_playback_id text,frameworks_asset_id text,frameworks_playback_id text,parent_playback_id text,title text);
    CREATE TABLE metoken_transactions(id text PRIMARY KEY,playback_id text);
    CREATE TABLE frameworks_asset_imports(livepeer_asset_id uuid,state text,frameworks_asset_id text,frameworks_playback_id text,source_sha256 text,source_bytes bigint);
    INSERT INTO video_assets(id,asset_id,playback_id,title) VALUES(1,'${sourceId}','old-play','Original');
    INSERT INTO metoken_transactions VALUES('tx','old-play');`);
  await db.query('INSERT INTO frameworks_asset_imports VALUES($1,$2,$3,$4,$5,$6)',[sourceId,'ready',mapping.frameworks_asset_id,mapping.frameworks_playback_id,mapping.source_sha256,123]);
  return db;
}
describe('guarded remap SQL execution',()=>{
  it('applies and repeats safely, then rolls back only identity fields, preserving newer metadata',async()=>{
    const db=await fixture(); try {
      const plan=makePlan(); await db.exec(renderAssetRemapSql(plan,'apply')); await db.exec(renderAssetRemapSql(plan,'apply'));
      expect((await db.query('SELECT playback_id FROM metoken_transactions')).rows).toEqual([{playback_id:'new-play'}]);
      await db.exec("UPDATE video_assets SET title='New title'"); await db.exec(renderAssetRemapSql(plan,'rollback')); await db.exec(renderAssetRemapSql(plan,'rollback'));
      expect((await db.query('SELECT asset_id,playback_id,title FROM video_assets')).rows).toEqual([{asset_id:sourceId,playback_id:'old-play',title:'New title'}]);
      expect((await db.query('SELECT playback_id FROM metoken_transactions')).rows).toEqual([{playback_id:'old-play'}]);
      expect((await db.query('SELECT state FROM frameworks_asset_imports')).rows).toEqual([{state:'ready'}]);
    } finally { await db.close(); }
  },30000);
  it('rolls back the entire transaction if a later reference has drifted',async()=>{
    const db=await fixture(); try {
      await db.exec("UPDATE metoken_transactions SET playback_id='concurrent-change'");
      await expect(db.exec(renderAssetRemapSql(makePlan(),'apply'))).rejects.toThrow(); await db.exec('ROLLBACK');
      expect((await db.query('SELECT asset_id FROM video_assets')).rows).toEqual([{asset_id:sourceId}]);
    } finally { await db.close(); }
  },30000);
  it('refuses a ledger that became ambiguous after the dry run',async()=>{
    const db=await fixture(); try {
      await db.exec("UPDATE frameworks_asset_imports SET state='ambiguous'");
      await expect(db.exec(renderAssetRemapSql(makePlan(),'apply'))).rejects.toThrow(); await db.exec('ROLLBACK');
      expect((await db.query('SELECT asset_id FROM video_assets')).rows).toEqual([{asset_id:sourceId}]);
    } finally { await db.close(); }
  },30000);
});
