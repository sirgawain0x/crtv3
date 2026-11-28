import {describe,expect,it} from 'vitest';
import {buildAssetCutoverPlan,renderAssetCutoverSql,type AccessVideoSnapshot} from './cutover-plan';
import {applyReviewedPublishedExceptions,type PublishedPlaybackException} from './published-exceptions';
import {buildAssetRemapPlan,type ReadyAssetMapping,type VideoIdentityRow} from './remap-plan';

const creator='0x'+'a'.repeat(40),hash='a'.repeat(64);
const id=(n:number)=>`0000000${n}-1111-4111-8111-111111111111`;

function legacy(n:number):VideoIdentityRow{
 return {id:n,asset_id:id(n),playback_id:`old-play-${n}`,status:'published',creator_id:creator,requires_metoken:false,metoken_price:0} as VideoIdentityRow;
}
function mapping(n:number):ReadyAssetMapping{
 return {livepeer_asset_id:id(n),livepeer_playback_id:`old-play-${n}`,frameworks_asset_id:`new-asset-${n}`,frameworks_playback_id:`new-play-${n}`,source_sha256:hash,source_bytes:123,state:'ready'};
}
const exception=(n:number,label:string):PublishedPlaybackException=>({videoId:n,legacyAssetId:id(n),legacyPlaybackId:`old-play-${n}`,label,reason:`import failed at the provider; recovery tracked separately`});

describe('reviewed published playback exceptions',()=>{
 it('exempts only the named unmapped published rows and keeps every other gap a blocker',()=>{
  const videos=[legacy(10),legacy(11),legacy(12),legacy(13)] as AccessVideoSnapshot[];
  const exceptions=[exception(10,'Monster'),exception(11,'Friends'),exception(12,'Tulleti - Brutality')];
  const plan=buildAssetCutoverPlan({videos,references:[],mappings:[],archive:[],publishedExceptions:exceptions});
  expect(plan.publishedExceptions.map(row=>row.label)).toEqual(['Monster','Friends','Tulleti - Brutality']);
  expect(plan.identities.blockers).toEqual(['Published video 13 has no verified ready mapping']);
  expect(()=>renderAssetCutoverSql(plan,'apply')).toThrow();
 });

 it('generates SQL once every gap is either mapped or named, and guards the excepted rows',()=>{
  const videos=[legacy(1),legacy(10),legacy(11),legacy(12)] as AccessVideoSnapshot[];
  const archive=[{assetId:id(1),playbackId:'old-play-1',sha256:hash,sizeBytes:123}];
  const plan=buildAssetCutoverPlan({videos,references:[],mappings:[mapping(1)],archive,
   publishedExceptions:[exception(10,'Monster'),exception(11,'Friends'),exception(12,'Tulleti - Brutality')]});
  expect(plan.identities.blockers).toEqual([]);
  const sql=renderAssetCutoverSql(plan,'apply');
  expect(sql.match(/published_exception_guard/g)).toHaveLength(3);
  // the excepted rows must be allowed to stay unmapped, and every other published row must be covered
  expect(sql).toContain("AND id NOT IN (1,10,11,12)");
  expect(sql).toContain("frameworks_asset_id IS NULL AND frameworks_playback_id IS NULL");
 });

 it('refuses an exception for a row that now has a verified mapping',()=>{
  const videos=[legacy(10)] as AccessVideoSnapshot[];
  const plan=buildAssetRemapPlan({videos,references:[],mappings:[mapping(10)],archive:[{assetId:id(10),playbackId:'old-play-10',sha256:hash,sizeBytes:123}]});
  expect(plan.blockers).toEqual([]);
  expect(()=>applyReviewedPublishedExceptions({plan,exceptions:[exception(10,'Monster')],videos})).toThrow(/not an unmapped published row/);
 });

 it('refuses identity drift, duplicate entries, drafts and already-mapped rows',()=>{
  const videos=[legacy(10),legacy(11)] as AccessVideoSnapshot[];
  const plan={patches:[],blockers:['Published video 10 has no verified ready mapping','Published video 11 has no verified ready mapping'],preservedDraftIds:[],unresolvedReferences:[]} as Parameters<typeof applyReviewedPublishedExceptions>[0]['plan'];
  expect(()=>applyReviewedPublishedExceptions({plan,exceptions:[{...exception(10,'Monster'),legacyPlaybackId:'old-play-11'}],videos})).toThrow(/playback id does not match/);
  expect(()=>applyReviewedPublishedExceptions({plan,exceptions:[exception(10,'Monster'),exception(10,'Monster again')],videos})).toThrow(/Duplicate published exception for video 10/);
  expect(()=>applyReviewedPublishedExceptions({plan,exceptions:[{...exception(10,'Monster'),reason:'  '}],videos})).toThrow(/needs a reason/);
  const draft=[{...legacy(10),status:'draft'}] as AccessVideoSnapshot[];
  expect(()=>applyReviewedPublishedExceptions({plan,exceptions:[exception(10,'Monster')],videos:draft})).toThrow(/not published/);
  const already=[{...legacy(10),frameworks_asset_id:'x',provider:'frameworks'}] as AccessVideoSnapshot[];
  expect(()=>applyReviewedPublishedExceptions({plan,exceptions:[exception(10,'Monster')],videos:already})).toThrow(/already carries a FrameWorks identity/);
 });

 it('rejects placeholder identities so an unfilled template cannot authorize a skip',()=>{
  const videos=[legacy(10)] as AccessVideoSnapshot[];
  const plan={patches:[],blockers:['Published video 10 has no verified ready mapping'],preservedDraftIds:[],unresolvedReferences:[]} as Parameters<typeof applyReviewedPublishedExceptions>[0]['plan'];
  expect(()=>applyReviewedPublishedExceptions({plan,exceptions:[{...exception(10,'Monster'),legacyAssetId:'PENDING-PRODUCTION-SNAPSHOT'}],videos})).toThrow(/placeholder legacy asset id/);
  expect(()=>applyReviewedPublishedExceptions({plan,exceptions:[{...exception(10,'Monster'),label:'TBD'}],videos})).toThrow(/placeholder label/);
 });
});
