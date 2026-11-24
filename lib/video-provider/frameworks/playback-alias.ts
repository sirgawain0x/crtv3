import {createServiceClient} from '@/lib/sdk/supabase/service';
import {isVideoAssetId} from '../asset-id';
/** Only reconciled ready imports create aliases; no guessed mapping or fallback after storage failure. */
export async function resolveFrameworksPlaybackAlias(playbackId:string):Promise<string> {
 if(!isVideoAssetId(playbackId))throw new Error('Invalid playback identity');
 const {data,error}=await createServiceClient().from('frameworks_asset_imports')
  .select('frameworks_playback_id').eq('livepeer_playback_id',playbackId).eq('state','ready').maybeSingle();
 if(error || (data && !isVideoAssetId(data.frameworks_playback_id)))throw new Error('Playback alias lookup unavailable');
 if(data)return data.frameworks_playback_id;
 const stream=await createServiceClient().from('streams').select('playback_id,frameworks_playback_id')
  .eq('livepeer_playback_id',playbackId).eq('provider','frameworks').maybeSingle();
 if(stream.error || (stream.data && (!isVideoAssetId(stream.data.frameworks_playback_id)||stream.data.playback_id!==stream.data.frameworks_playback_id)))throw new Error('Playback alias lookup unavailable');
 return stream.data?.frameworks_playback_id??playbackId;
}
