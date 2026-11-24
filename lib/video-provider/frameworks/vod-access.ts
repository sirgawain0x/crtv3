import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyWalletAuthArgs, type WalletAuthArgs } from '@/lib/auth/require-wallet';
import { frameworksAssets } from './assets';
import { secureFrameworksVod } from './vod-policy';
import { requireReadyFrameworksClip } from './clip-policy';
export type VodAccessChanges={status?:string;requires_metoken?:boolean;metoken_price?:number|null};

/** Register from a provider-created upload session, never from client-supplied video metadata. */
export async function registerProtectedVod(db:SupabaseClient,input:{assetId:string;playbackId:string;creator:string}):Promise<void> {
  const {error}=await db.from('frameworks_vod_access').insert({asset_id:input.assetId,playback_id:input.playbackId,
    creator_id:input.creator.toLowerCase(),status:'draft',requires_metoken:false});
  // Do not upsert: no retry may replace the owner or relax an existing policy.
  if(error) throw new Error('Could not register protected VOD ownership');
}

/** Only owner-verified changes reach playback authority; ordinary metadata writes cannot relax access. */
export async function updateFrameworksVodAccess(db:SupabaseClient,id:number,changes:VodAccessChanges,auth?:WalletAuthArgs):Promise<void> {
  if(changes.status===undefined && changes.requires_metoken===undefined && changes.metoken_price===undefined)return;
  const {address}=await verifyWalletAuthArgs(auth);
  const {data:row,error}=await db.from('video_assets').select('asset_id,playback_id,creator_id').eq('id',id).single();
  if(error || !row || row.creator_id?.toLowerCase()!==address.toLowerCase())throw new Error('Video ownership authorization failed');
  if(changes.status!==undefined && !['draft','published','minted','archived'].includes(changes.status))throw new Error('Invalid VOD status');
  if(changes.metoken_price!==undefined && changes.metoken_price!==null && (!Number.isFinite(changes.metoken_price) || changes.metoken_price<0)) throw new Error('Invalid VOD access price');
  if(changes.status==='published' || changes.status==='minted') {
   const {data:authority,error:authorityError}=await db.from('frameworks_vod_access').select('parent_stream_id').eq('asset_id',row.asset_id).single();
   if(authorityError||!authority)throw new Error('Protected playback authority unavailable');
   // Imported historical clips are VOD uploads; only server-registered native clips use the Clip API.
   if(authority.parent_stream_id) {
    await requireReadyFrameworksClip(row.asset_id,row.playback_id);
   } else {
    const asset=await frameworksAssets.get(row.asset_id);
    if(!asset || asset.id!==row.asset_id || asset.playbackId!==row.playback_id || asset.status?.phase!=='ready')throw new Error('Video is not ready for publishing');
    await secureFrameworksVod(row.asset_id,row.playback_id);
   }
  }
  const {error:writeError}=await db.rpc('update_frameworks_vod_access',{p_video_id:id,p_owner:address.toLowerCase(),
    p_status:changes.status??null,p_requires_metoken:changes.requires_metoken??null,
    p_metoken_price:changes.metoken_price??null,p_price_supplied:changes.metoken_price!==undefined});
  if(writeError)throw new Error('Could not update protected VOD access');
}
