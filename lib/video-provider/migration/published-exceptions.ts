import type {RemapPlan,VideoIdentityRow} from './remap-plan';

/**
 * A published video deliberately left on the retired provider because its source
 * could not be imported. The identity is recorded from the production snapshot and
 * re-checked against it, so a renamed, re-published or later-mapped row cannot
 * inherit the exception.
 */
export type PublishedPlaybackException={
 videoId:number;
 legacyAssetId:string;
 legacyPlaybackId:string;
 label:string;
 reason:string;
};

const PUBLISHED=['published','minted'];
const blockerText=(videoId:number)=>`Published video ${videoId} has no verified ready mapping`;
const placeholder=/pending|placeholder|tbd|todo|changeme|unapproved|unknown|^null$|^none$/i;

function text(value:unknown,field:string,videoId:number):string{
 if(typeof value!=='string'||!value.trim())throw new Error(`Published exception ${videoId} needs a ${field}`);
 const trimmed=value.trim();
 if(trimmed.length>1000)throw new Error(`Published exception ${videoId} has an over-long ${field}`);
 if(placeholder.test(trimmed))throw new Error(`Published exception ${videoId} carries placeholder ${field} evidence`);
 return trimmed;
}
function identity(value:unknown,field:string,videoId:number):string{
 if(typeof value!=='string'||!value.trim())throw new Error(`Published exception ${videoId} needs a ${field}`);
 if(placeholder.test(value))throw new Error(`Published exception ${videoId} carries a placeholder ${field}; fill it from the production snapshot`);
 return value;
}

/**
 * Removes only the reviewed unmapped-published blockers, and only when each exception
 * still matches the snapshot exactly. Anything the list does not name stays a blocker,
 * so an unexpected gap still halts the plan.
 */
export function applyReviewedPublishedExceptions(input:{plan:RemapPlan;exceptions:PublishedPlaybackException[];videos:VideoIdentityRow[]}):{plan:RemapPlan;excluded:PublishedPlaybackException[]}{
 const excluded:PublishedPlaybackException[]=[];
 const seenIds=new Set<number>();const seenIdentity=new Set<string>();
 for(const exception of input.exceptions){
  const videoId=exception?.videoId;
  if(!Number.isSafeInteger(videoId)||videoId<=0)throw new Error('Published exception needs a positive production video id');
  if(seenIds.has(videoId))throw new Error(`Duplicate published exception for video ${videoId}`);
  seenIds.add(videoId);
  const legacyAssetId=identity(exception.legacyAssetId,'legacy asset id',videoId);
  const legacyPlaybackId=identity(exception.legacyPlaybackId,'legacy playback id',videoId);
  const label=text(exception.label,'label',videoId),reason=text(exception.reason,'reason',videoId);
  const key=`${legacyAssetId}:${legacyPlaybackId}`;
  if(seenIdentity.has(key))throw new Error(`Duplicate published exception identity for video ${videoId}`);
  seenIdentity.add(key);
  if(!input.plan.blockers.includes(blockerText(videoId)))
   throw new Error(`Published video ${videoId} is not an unmapped published row, so the exception does not apply`);
  const row=input.videos.find(video=>video.id===videoId);
  if(!row)throw new Error(`Published exception ${videoId} matches no row in the snapshot`);
  if(!PUBLISHED.includes(row.status))throw new Error(`Video ${videoId} is ${row.status}, not published; the exception does not apply`);
  if((row.livepeer_asset_id||row.asset_id)!==legacyAssetId)
   throw new Error(`Published exception ${videoId} legacy asset id does not match the snapshot`);
  if((row.livepeer_playback_id||row.playback_id)!==legacyPlaybackId)
   throw new Error(`Published exception ${videoId} legacy playback id does not match the snapshot`);
  if(row.frameworks_asset_id||row.frameworks_playback_id||row.provider==='frameworks')
   throw new Error(`Video ${videoId} already carries a FrameWorks identity; it must be remapped, not excepted`);
  excluded.push({videoId,legacyAssetId,legacyPlaybackId,label,reason});
 }
 const allowed=new Set(excluded.map(row=>row.videoId));
 return {plan:{...input.plan,
  blockers:input.plan.blockers.filter(text=>{
   const match=/^Published video (\d+) has no verified ready mapping$/.exec(text);
   return !(match&&allowed.has(Number(match[1])));
  }),
  publishedExceptions:excluded},excluded};
}
