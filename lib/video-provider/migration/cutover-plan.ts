import {preserveReviewedReferences,type PreservedReference} from './reference-exceptions';
import type {ArchivedSource} from './archive';
import type {SystemPublicAsset} from './system-assets';
import {applyReviewedPublishedExceptions} from './published-exceptions';
import type {PublishedPlaybackException} from './published-exceptions';
import {buildAssetRemapPlan,renderAssetRemapSql,type ReadyAssetMapping,type ReferenceRow,type RemapPlan,type VideoIdentityRow} from './remap-plan';
export type AccessVideoSnapshot=VideoIdentityRow & {creator_id:string;requires_metoken:boolean;metoken_price:number|string|null};
type AccessSeed={videoId:number;assetId:string;playbackId:string;creator:string;sourceCreator:string;status:string;required:boolean;price:string|null;mapping:ReadyAssetMapping};
export type AssetCutoverPlan={identities:RemapPlan;accessSeeds:AccessSeed[];systemSeeds:Array<{creator:string;mapping:ReadyAssetMapping}>;blockers:string[];preservedReferences:PreservedReference[];publishedExceptions:PublishedPlaybackException[]};
function sqlString(value:string):string {
 if(value.includes('\0'))throw new Error('Invalid cutover SQL value');return `'${value.replaceAll("'","''")}'`;
}
function priceSql(value:string|null):string{return value===null?'NULL':`${sqlString(value)}::numeric`;}
/** Adds authoritative playback records from the reviewed source snapshot, never inferred from new provider IDs. */
export function buildAssetCutoverPlan(input:{videos:AccessVideoSnapshot[];references:ReferenceRow[];mappings:ReadyAssetMapping[];archive:ArchivedSource[];preserveReferences?:PreservedReference[];publishedExceptions?:PublishedPlaybackException[];systemAssets?:SystemPublicAsset[]}):AssetCutoverPlan {
 const reviewed=preserveReviewedReferences({plan:buildAssetRemapPlan(input),exceptions:input.preserveReferences??[],...input});
 const excepted=applyReviewedPublishedExceptions({plan:reviewed.plan,exceptions:input.publishedExceptions??[],videos:input.videos});
 const result:AssetCutoverPlan={identities:excepted.plan,accessSeeds:[],systemSeeds:[],blockers:[],preservedReferences:reviewed.preserved,publishedExceptions:excepted.excluded};
 const mappings=new Map(input.mappings.map(map=>[map.livepeer_asset_id,map]));
 for(const source of input.systemAssets??[]){
  const archived=input.archive.find(row=>row.assetId===source.assetId),mapping=mappings.get(source.assetId);
  if(!archived||!mapping||archived.playbackId!==source.playbackId||archived.sha256!==source.sha256||archived.sizeBytes!==source.sizeBytes||
    !/^0x[0-9a-f]{40}$/i.test(source.creator)||input.videos.some(row=>(row.livepeer_asset_id||row.asset_id)===source.assetId)){
   result.blockers.push(`System asset ${source.assetId} needs its reviewed independent ready mapping`);continue;
  }
  result.systemSeeds.push({creator:source.creator.toLowerCase(),mapping});
 }
 for(const row of input.videos){
  const mapping=mappings.get(row.livepeer_asset_id||row.asset_id);if(!mapping)continue;
  const price=row.metoken_price===null?null:String(row.metoken_price);
  if(typeof row.creator_id!=='string' || !/^0x[0-9a-f]{40}$/i.test(row.creator_id) || typeof row.requires_metoken!=='boolean' ||
    !['draft','published','minted','archived'].includes(row.status) ||
    (price!==null && (!/^(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i.test(price) || !Number.isFinite(Number(price)) || Number(price)<0))){
   result.blockers.push(`Video ${row.id} needs reviewed creator and payment rules`);continue;
  }
  result.accessSeeds.push({videoId:row.id,assetId:mapping.frameworks_asset_id,playbackId:mapping.frameworks_playback_id,
   creator:row.creator_id.toLowerCase(),sourceCreator:row.creator_id,status:row.status,required:row.requires_metoken,price,mapping});
 }
 return result;
}
/** Identity remap and access seeding share one transaction; rollback retains access records and import reservations. */
export function renderAssetCutoverSql(plan:AssetCutoverPlan,direction:'apply'|'rollback'):string {
 if(plan.blockers.length)throw new Error('Resolve creator/payment snapshot exceptions before generating cutover SQL');
 const base=renderAssetRemapSql(plan.identities,direction);
 if(direction==='rollback')return '-- Retain imported access records and reservations during identity rollback.\n'+base;
 const publishedIds=plan.accessSeeds.filter(seed=>['published','minted'].includes(seed.status)).map(seed=>{
  if(!Number.isSafeInteger(seed.videoId)||seed.videoId<=0)throw new Error('Invalid published video identity');
  return seed.videoId;
 });
 const statements=plan.accessSeeds.map(seed=>{
  if(!Number.isSafeInteger(seed.videoId)||seed.videoId<=0)throw new Error('Invalid video row identity');
  const price=priceSql(seed.price), required=seed.required?'true':'false';const map=seed.mapping;
  if(!Number.isSafeInteger(map.source_bytes)||map.source_bytes<=0)throw new Error("Invalid mapping source size");
  const expected=`asset_id=${sqlString(seed.assetId)} AND playback_id=${sqlString(seed.playbackId)} AND creator_id=${sqlString(seed.sourceCreator)} AND status=${sqlString(seed.status)} AND requires_metoken IS NOT DISTINCT FROM ${required} AND metoken_price IS NOT DISTINCT FROM ${price}`;
  const authority=`asset_id=${sqlString(seed.assetId)} AND playback_id=${sqlString(seed.playbackId)} AND creator_id=${sqlString(seed.creator)} AND status=${sqlString(seed.status)} AND requires_metoken=${required} AND metoken_price IS NOT DISTINCT FROM ${price}`;
  const ready=`EXISTS(SELECT 1 FROM public.frameworks_asset_imports WHERE livepeer_asset_id=${sqlString(map.livepeer_asset_id)}::uuid AND state='ready' AND frameworks_asset_id=${sqlString(seed.assetId)} AND frameworks_playback_id=${sqlString(seed.playbackId)} AND source_sha256=${sqlString(map.source_sha256)} AND source_bytes=${map.source_bytes})`;
  return `WITH source AS (SELECT id FROM public.video_assets WHERE id=${seed.videoId} AND ${expected} AND ${ready} FOR UPDATE), seeded AS (\n INSERT INTO public.frameworks_vod_access(asset_id,playback_id,creator_id,status,requires_metoken,metoken_price)\n SELECT ${sqlString(seed.assetId)},${sqlString(seed.playbackId)},${sqlString(seed.creator)},${sqlString(seed.status)},${required},${price} FROM source\n ON CONFLICT(asset_id) DO NOTHING RETURNING asset_id)\nSELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM source) AND ((SELECT count(*) FROM seeded)=1 OR EXISTS(SELECT 1 FROM public.frameworks_vod_access WHERE ${authority})) THEN 1 ELSE 0 END AS access_guard;`;
 });
 for(const seed of plan.systemSeeds){
  const map=seed.mapping;
  if(!Number.isSafeInteger(map.source_bytes)||map.source_bytes<=0)throw new Error('Invalid system source size');
  const ready=`EXISTS(SELECT 1 FROM public.frameworks_asset_imports WHERE livepeer_asset_id=${sqlString(map.livepeer_asset_id)}::uuid AND state='ready' AND frameworks_asset_id=${sqlString(map.frameworks_asset_id)} AND frameworks_playback_id=${sqlString(map.frameworks_playback_id)} AND source_sha256=${sqlString(map.source_sha256)} AND source_bytes=${map.source_bytes})`;
  const authority=`asset_id=${sqlString(map.frameworks_asset_id)} AND playback_id=${sqlString(map.frameworks_playback_id)} AND creator_id=${sqlString(seed.creator)} AND status='published' AND requires_metoken=false AND metoken_price=0`;
  statements.push(`WITH seeded AS (INSERT INTO public.frameworks_vod_access(asset_id,playback_id,creator_id,status,requires_metoken,metoken_price) SELECT ${sqlString(map.frameworks_asset_id)},${sqlString(map.frameworks_playback_id)},${sqlString(seed.creator)},'published',false,0 WHERE ${ready} ON CONFLICT(asset_id) DO NOTHING RETURNING asset_id) SELECT 1 / CASE WHEN ${ready} AND ((SELECT count(*) FROM seeded)=1 OR EXISTS(SELECT 1 FROM public.frameworks_vod_access WHERE ${authority})) THEN 1 ELSE 0 END AS system_asset_guard;`);
 }
 // A new publication since the snapshot must not be silently left on the retired provider.
 const exceptionIds=plan.publishedExceptions.map(exception=>{
  if(!Number.isSafeInteger(exception.videoId)||exception.videoId<=0)throw new Error('Invalid excepted published video identity');
  return exception.videoId;
 });
 // Excepted rows are allowed to stay on the retired provider, but only in the exact
 // unmapped shape that was reviewed; anything else is an unexpected gap and aborts.
 for(const exception of plan.publishedExceptions){
  statements.push(`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM public.video_assets WHERE id=${exception.videoId} AND asset_id=${sqlString(exception.legacyAssetId)} AND playback_id=${sqlString(exception.legacyPlaybackId)} AND status IN ('published','minted') AND provider IS DISTINCT FROM 'frameworks' AND frameworks_asset_id IS NULL AND frameworks_playback_id IS NULL) THEN 1 ELSE 0 END AS published_exception_guard;`);
 }
 const coveredIds=[...publishedIds,...exceptionIds];
 statements.push(`SELECT 1 / CASE WHEN NOT EXISTS(SELECT 1 FROM public.video_assets WHERE status IN ('published','minted')${coveredIds.length?` AND id NOT IN (${coveredIds.join(',')})`:''}) THEN 1 ELSE 0 END AS published_catalog_guard;`);
 const allowedFields:Record<string,string[]>={metoken_transactions:['playback_id'],hack_beta_submissions:['video_asset_id','playback_id'],shoppable_videos:['livepeer_asset_id','livepeer_playback_id']};
 for(const row of plan.preservedReferences){
  if(!allowedFields[row.table]?.includes(row.field))throw new Error('Invalid preserved reference column');
  statements.push(`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM public.${row.table} WHERE id::text=${sqlString(String(row.id))} AND ${row.field} IS NOT DISTINCT FROM ${sqlString(row.value)}) THEN 1 ELSE 0 END AS preserved_reference_guard;`);
 }
 return base.replace('SET LOCAL standard_conforming_strings = on;',
  'SET LOCAL standard_conforming_strings = on;\nLOCK TABLE public.video_assets IN SHARE ROW EXCLUSIVE MODE;')
  .replace(/COMMIT;\n$/,statements.join('\n\n')+'\n\nCOMMIT;\n');
}
