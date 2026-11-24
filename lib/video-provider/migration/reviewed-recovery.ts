import type {SupabaseClient} from '@supabase/supabase-js';
import type {ArchivedSource} from './archive';
import {createImportLedger} from './supabase-ledger';
import {frameworksAssets} from '../frameworks/assets';
import {secureFrameworksVod} from '../frameworks/vod-policy';
import {inspectMigrationPlayback} from './inspect-playback';

// A forensic review of this exact failed pre-transfer attempt; never a generic retry switch.
const reviewed={assetId:'bd18c602-9323-4b6e-aa90-7f8e8065e416',playbackId:'bd18hlmb6vazgsy8',sizeBytes:160998594,
 sha256:'ab4ea28fdac612cf2f1f588ace9691683ac85fe3e9c84193e0e0c044a111313e',
 originalAsset:'202611241631464302d8bfdb5ddbae',originalPlayback:'mBdbNNDWgTBDqQfu'};
export function requireReviewedRecoverySource(source:ArchivedSource){
 if(source.assetId!==reviewed.assetId||source.playbackId!==reviewed.playbackId||source.sizeBytes!==reviewed.sizeBytes||source.sha256!==reviewed.sha256)
  throw new Error('This source has no reviewed replacement plan');
}
export async function prepareReviewedRecovery(db:SupabaseClient,source:ArchivedSource,reviewer:string){
 requireReviewedRecoverySource(source);
 const original=await createImportLedger(db).find(source.assetId);
 if(original?.state!=='ambiguous'||original.frameworks_asset_id!==reviewed.originalAsset||original.frameworks_playback_id!==reviewed.originalPlayback)
  throw new Error('The reviewed original reservation changed');
 const artifact=await frameworksAssets.get(reviewed.originalAsset);
 if(!artifact||artifact.id!==reviewed.originalAsset||artifact.playbackId!==reviewed.originalPlayback||artifact.status?.phase?.toLowerCase()!=='processing'||Number(artifact.videoSpec?.duration)>0)
  throw new Error('The reviewed original artifact changed');
 // Keep the original protected and retained; no upload, reset, deletion or replacement happens here.
 await secureFrameworksVod(reviewed.originalAsset,reviewed.originalPlayback);
 const {error}=await db.rpc('prepare_reviewed_frameworks_recovery',{p_reviewer:reviewer.toLowerCase()});
 if(error)throw new Error('Could not preserve the reviewed recovery evidence');
}
export async function adoptVerifiedRecovery(db:SupabaseClient,source:ArchivedSource){
 requireReviewedRecoverySource(source);
 const recovered=await createImportLedger(db,'frameworks_import_recoveries').find(source.assetId);
 if(recovered?.state!=='ready'||!recovered.frameworks_asset_id||!recovered.frameworks_playback_id||
  recovered.source_sha256!==source.sha256||recovered.source_bytes!==source.sizeBytes||recovered.livepeer_playback_id!==source.playbackId)
  throw new Error('A matching verified replacement is required');
 await secureFrameworksVod(reviewed.originalAsset,reviewed.originalPlayback);
 await secureFrameworksVod(recovered.frameworks_asset_id,recovered.frameworks_playback_id);
 const inspected=await inspectMigrationPlayback(recovered.frameworks_playback_id,fetch,recovered.frameworks_asset_id);
 if(!inspected.playableManifest)throw new Error('Replacement playback has not passed');
 const {error}=await db.rpc('adopt_verified_frameworks_recovery',{p_source:source.assetId});
 if(error)throw new Error('Could not adopt the verified replacement; original evidence is retained');
}
