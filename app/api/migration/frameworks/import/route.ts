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
import {prepareReviewedRecovery,adoptVerifiedRecovery,requireReviewedRecoverySource,ReviewedRecoveryError} from '@/lib/video-provider/migration/reviewed-recovery';
import {FailedImportRetryError,prepareFailedImportRetry} from '@/lib/video-provider/migration/failed-import-retry';
import {openArchiveImportSource,resolveMigrationArchiveRoot} from '@/lib/video-provider/migration/archive-source';
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
  if(!['import','poll','inspect-playback','inspect-reservation','prepare-recovery','import-recovery','poll-recovery','adopt-recovery','prepare-retry','retry-import'].includes(mode)||!body.source||typeof body.source!=='object')throw new Error();
  [source]=archivedSourcesFromManifests([{assets:[{...body.source,status:'archived'}]}]);
  if(!source || source.sizeBytes>1024**3)throw new Error();
 }catch{return respond({error:'One verified source up to 1 GiB is required'},400);}
 try{
  if(mode==='prepare-retry'){
   const db=createServiceClient();
   const prepared=await prepareFailedImportRetry(db,source);
   return respond({message:prepared.action==='reset'?'Failed import reset to prepared; retry from the verified archive mirror.':prepared.action==='reserved'?'Import reserved from archive evidence; proceed with retry-import.':'Import already prepared for checksum-verified retry.',prepared});
  }
  if(mode==='retry-import'){
   const archiveRoot=resolveMigrationArchiveRoot();
   if(!archiveRoot)return respond({error:'FRAMEWORKS_MIGRATION_ARCHIVE_ROOT is required for archive retries'},503);
   const ledger=createImportLedger(createServiceClient());
   const record=await ledger.find(source.assetId);
   if(record?.state==='ready')return respond({error:'Ready imports cannot be retried'},409);
   if(!record||record.livepeer_playback_id!==source.playbackId||record.source_sha256!==source.sha256||record.source_bytes!==source.sizeBytes)return respond({error:'Prepare retry and matching reservation required'},409);
   if(record.state!=='prepared')return respond({error:'Import must be in prepared state after prepare-retry'},409);
   const file=await openArchiveImportSource(archiveRoot,source);
   try{
    const outcome=await runAssetImport({source,ledger,provider:createFrameworksImportProvider(),file});
    return respond({outcome,retry:true});
   }finally{await file.close();}
  }
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
  if(error instanceof FailedImportRetryError)return respond({error:error.message},409);
  if(error instanceof ReviewedRecoveryError)return respond({error:error.message},409);
  if(mode.endsWith('-recovery'))return respond({error:error instanceof ImportStoppedError?`Replacement stopped during protected upload preparation (${error.failureCode}). Inspect its separate recovery reservation; do not recreate an uncertain replacement.`:'Replacement recovery stopped. The original is retained. Inspect the separate recovery reservation using the recovery controls; do not recreate an uncertain replacement.'},409);
  if(error instanceof ImportStoppedError)return respond({error:error.message,failureCode:error.failureCode},409);
  return respond({error:'Import stopped. Inspect its reservation before retrying; use Poll for an existing processing import.'},409);
 }
}
