import {describe,expect,it} from 'vitest';
import {preserveReviewedReferences} from './reference-exceptions';
import type {RemapPlan,ReferenceRow} from './remap-plan';
const row={table:'metoken_transactions',id:'tx',field:'playback_id',value:'retired-play'};
const plan:RemapPlan={patches:[],blockers:['Published video has no mapping'],preservedDraftIds:[],unresolvedReferences:[row]};
const input={plan,exceptions:[{...row,reason:'Keep historical payment reference unchanged; source absent from the archive and current videos/streams.'}],videos:[],references:[{table:'metoken_transactions',id:'tx',values:{playback_id:'retired-play'}}] as ReferenceRow[],archive:[]};
describe('explicit historical reference preservation',()=>{
 it('preserves the exact reference while keeping published coverage blockers',()=>{
  const result=preserveReviewedReferences(input);expect(result.plan.unresolvedReferences).toEqual([]);expect(result.plan.blockers).toEqual(plan.blockers);expect(result.preserved).toHaveLength(1);expect(plan.unresolvedReferences).toHaveLength(1);
 });
 it('rejects stale, broad or duplicate exceptions',()=>{
  for(const exceptions of [[{...input.exceptions[0],value:'different'}],[{...input.exceptions[0],reason:''}],[...input.exceptions,...input.exceptions]]) expect(()=>preserveReviewedReferences({...input,exceptions})).toThrow();
 });
 it('cannot exempt a known archive or active video identity from verified mapping',()=>{
  expect(()=>preserveReviewedReferences({...input,archive:[{assetId:'source',playbackId:'retired-play',sha256:'a'.repeat(64),sizeBytes:1}]})).toThrow(/known/);
  expect(()=>preserveReviewedReferences({...input,videos:[{id:1,asset_id:'source',playback_id:'retired-play',status:'published'}]})).toThrow(/known/);
 });
});
