import {NextRequest,NextResponse} from 'next/server';
import {requirePlatformAdmin,PlatformAdminAuthError} from '@/lib/access/require-platform-admin';
import {createServiceClient} from '@/lib/sdk/supabase/service';
import {archivedSourcesFromManifests} from '@/lib/video-provider/migration/archive';
import {runAssetImport} from '@/lib/video-provider/migration/importer';
import {createImportLedger} from '@/lib/video-provider/migration/supabase-ledger';
import {createFrameworksImportProvider} from '@/lib/video-provider/migration/frameworks-import-provider';
import {createStudioImportSource} from '@/lib/video-provider/migration/studio-source';
import {isFrameworksMigrationStaging} from '@/lib/video-provider/migration/staging-runtime';
import {rateLimiters} from '@/lib/middleware/rateLimit';
import {inspectMigrationPlayback} from '@/lib/video-provider/migration/inspect-playback';
import {inspectMigrationReservation} from '@/lib/video-provider/migration/inspect-reservation';
import {ImportStoppedError} from '@/lib/video-provider/migration/import-failure';
import {prepareReviewedRecovery,adoptVerifiedRecovery,requireReviewedRecoverySource} from '@/lib/video-provider/migration/reviewed-recovery';
export const runtime='nodejs';
export const maxDuration=300;
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:NextRequest){
 if(!isFrameworksMigrationStaging())return respond({error:'Not found'},404);
 let reviewer:string;
 try{reviewer=(await requirePlatformAdmin(request)).address;}catch(error){if(error instanceof PlatformAdminAuthError)return respond({error:error.message},error.status);return respond({error:'Admin authorization unavailable'},503);}
 const limited=await rateLimiters.standard(request);if(limited)return limited;
 let source,mode;
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>4096)return respond({error:'Source request too large'},413);
  const body=JSON.parse(raw);mode=body.mode;
  if(!['import','poll','inspect-playback','inspect-reservation','prepare-recovery','import-recovery','poll-recovery','adopt-recovery'].includes(mode)||!body.source||typeof body.source!=='object')throw new Error();
  [source]=archivedSourcesFromManifests([{assets:[{...body.source,status:'archived'}]}]);
  if(!source || source.sizeBytes>1024**3)throw new Error();
 }catch{return respond({error:'One verified source up to 1 GiB is required'},400);}
 try{
  if(mode.endsWith('-recovery')){
   requireReviewedRecoverySource(source);
   const db=createServiceClient();
   if(mode==='prepare-recovery'){
    await prepareReviewedRecovery(db,source,reviewer);
    return respond({message:'Original attempt retained under JWT quarantine. A separate reviewed replacement is reserved; no media was uploaded.'});
   }
   if(mode==='adopt-recovery'){
    await adoptVerifiedRecovery(db,source);
    return respond({message:'Verified replacement adopted. Original attempt and recovery audit are retained.'});
   }
   const ledger=createImportLedger(db,'frameworks_import_recoveries');
   if(!await ledger.find(source.assetId))return respond({error:'Prepare the reviewed recovery reservation first'},409);
   const outcome=await runAssetImport({source,ledger,provider:createFrameworksImportProvider(),file:mode==='import-recovery'?createStudioImportSource():undefined});
   return respond({outcome,recovery:true});
  }
  if(mode==='inspect-reservation'){
   const record=await createImportLedger(createServiceClient()).find(source.assetId);
   if(!record||record.livepeer_playback_id!==source.playbackId||record.source_sha256!==source.sha256||record.source_bytes!==source.sizeBytes)return respond({error:'Matching verified reservation required'},409);
   return respond({diagnostic:await inspectMigrationReservation(source)});
  }
  if(mode==='inspect-playback'){
   const record=await createImportLedger(createServiceClient()).find(source.assetId);
   if(!record||record.state!=='ready'||record.livepeer_playback_id!==source.playbackId||record.source_sha256!==source.sha256||record.source_bytes!==source.sizeBytes||!record.frameworks_playback_id)return respond({error:'Verified ready import required'},409);
   return respond({diagnostic:await inspectMigrationPlayback(record.frameworks_playback_id,fetch,record.frameworks_asset_id??undefined)});
  }
  const outcome=await runAssetImport({source,ledger:createImportLedger(createServiceClient()),provider:createFrameworksImportProvider(),
   file:mode==='import'?createStudioImportSource():undefined});
  return respond({outcome});
 }catch(error){
  // A timeout can leave a reservation. Do not return provider errors, URLs or credentials, or retry creation automatically.
  return respond({error:error instanceof ImportStoppedError?error.message:'Import stopped. Inspect its reservation before retrying; use Poll for an existing processing import.'},409);
 }
}
