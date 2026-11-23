import type {ArchivedSource} from './archive';
import type {ReferenceRow,RemapPlan,UnresolvedReference,VideoIdentityRow} from './remap-plan';
export type PreservedReference=UnresolvedReference & {reason:string};
/** Explicit row/field/value exceptions preserve retired references; they cannot hide an unimported known source. */
export function preserveReviewedReferences(input:{plan:RemapPlan;exceptions:PreservedReference[];videos:VideoIdentityRow[];references:ReferenceRow[];archive:ArchivedSource[]}):{plan:RemapPlan;preserved:PreservedReference[]} {
 const known=new Set<string>();
 for(const source of input.archive){known.add(source.assetId);if(source.playbackId)known.add(source.playbackId);}
 for(const video of input.videos)for(const value of [video.asset_id,video.playback_id,video.livepeer_asset_id,video.livepeer_playback_id,video.parent_playback_id])if(value)known.add(value);
 const preserved:PreservedReference[]=[];const seen=new Set<string>();
 const key=(row:UnresolvedReference)=>JSON.stringify([row.table,String(row.id),row.field,row.value]);
 for(const exception of input.exceptions){
  const identity=key(exception);
  if(seen.has(identity) || typeof exception.reason!=='string' || !exception.reason.trim() || exception.reason.length>1000)throw new Error('Invalid or duplicate reference preservation exception');
  seen.add(identity);
  const actual=input.plan.unresolvedReferences.find(row=>key(row)===identity);
  const snapshot=input.references.find(row=>row.table===exception.table && String(row.id)===String(exception.id));
  if(!actual || !snapshot || snapshot.values[exception.field]!==exception.value)throw new Error('Preserved reference no longer matches the unresolved snapshot');
  if(known.has(exception.value))throw new Error('A known video/archive identity cannot be exempted from its verified mapping');
  preserved.push({...actual,reason:exception.reason.trim()});
 }
 return {plan:{...input.plan,unresolvedReferences:input.plan.unresolvedReferences.filter(row=>!seen.has(key(row)))},preserved};
}
