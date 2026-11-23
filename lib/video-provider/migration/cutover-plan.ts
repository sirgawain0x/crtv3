import {preserveReviewedReferences,type PreservedReference} from './reference-exceptions';
import type {ArchivedSource} from './archive';
import {buildAssetRemapPlan,renderAssetRemapSql,type ReadyAssetMapping,type ReferenceRow,type RemapPlan,type VideoIdentityRow} from './remap-plan';
export type AccessVideoSnapshot=VideoIdentityRow & {creator_id:string;requires_metoken:boolean;metoken_price:number|string|null};
type AccessSeed={videoId:number;assetId:string;playbackId:string;creator:string;sourceCreator:string;status:string;required:boolean;price:string|null;mapping:ReadyAssetMapping};
export type AssetCutoverPlan={identities:RemapPlan;accessSeeds:AccessSeed[];blockers:string[];preservedReferences:PreservedReference[]};
function sqlString(value:string):string {
 if(value.includes('\0'))throw new Error('Invalid cutover SQL value');return `'${value.replaceAll("'","''")}'`;
}
function priceSql(value:string|null):string{return value===null?'NULL':`${sqlString(value)}::numeric`;}
/** Adds authoritative playback records from the reviewed source snapshot, never inferred from new provider IDs. */
export function buildAssetCutoverPlan(input:{videos:AccessVideoSnapshot[];references:ReferenceRow[];mappings:ReadyAssetMapping[];archive:ArchivedSource[];preserveReferences?:PreservedReference[]}):AssetCutoverPlan {
 const reviewed=preserveReviewedReferences({plan:buildAssetRemapPlan(input),exceptions:input.preserveReferences??[],...input});
 const result:AssetCutoverPlan={identities:reviewed.plan,accessSeeds:[],blockers:[],preservedReferences:reviewed.preserved};
 const mappings=new Map(input.mappings.map(map=>[map.livepeer_asset_id,map]));
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
 // A new publication since the snapshot must not be silently left on the retired provider.
 statements.push(`SELECT 1 / CASE WHEN NOT EXISTS(SELECT 1 FROM public.video_assets WHERE status IN ('published','minted')${publishedIds.length?` AND id NOT IN (${publishedIds.join(',')})`:''}) THEN 1 ELSE 0 END AS published_catalog_guard;`);
 const allowedFields:Record<string,string[]>={metoken_transactions:['playback_id'],hack_beta_submissions:['video_asset_id','playback_id'],shoppable_videos:['livepeer_asset_id','livepeer_playback_id']};
 for(const row of plan.preservedReferences){
  if(!allowedFields[row.table]?.includes(row.field))throw new Error('Invalid preserved reference column');
  statements.push(`SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM public.${row.table} WHERE id::text=${sqlString(String(row.id))} AND ${row.field} IS NOT DISTINCT FROM ${sqlString(row.value)}) THEN 1 ELSE 0 END AS preserved_reference_guard;`);
 }
 return base.replace('SET LOCAL standard_conforming_strings = on;',
  'SET LOCAL standard_conforming_strings = on;\nLOCK TABLE public.video_assets IN SHARE ROW EXCLUSIVE MODE;')
  .replace(/COMMIT;\n$/,statements.join('\n\n')+'\n\nCOMMIT;\n');
}
