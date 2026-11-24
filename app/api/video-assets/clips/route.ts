import { metric } from '@vercel/functions';
import { NextRequest, NextResponse } from "next/server";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { createClipVideoAsset } from "@/services/video-assets";
import { getClipThumbnailUrl } from "@/services/livepeer-clips";
import { getStreamByPlaybackId } from "@/services/streams";
import { serverLogger } from "@/lib/utils/logger";
import { resolveVideoProviderId } from '@/lib/video-provider/config';
import { requireWalletAuthFor, WalletAuthError } from '@/lib/auth/require-wallet';
import { createServiceClient } from '@/lib/sdk/supabase/service';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

async function handleClip(request: NextRequest) {
  const verification = await checkBotIdDeep();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const rl = await rateLimiters.strict(request);
  if (rl) return rl;

  let body: any;
  try {

    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    assetId,
    playbackId,
    playbackUrl,
    name,
    parentPlaybackId,
    parentStoryIpId,
    clipStartMs,
    clipEndMs,
    clipperAddress,
  } = body ?? {};

  if (!assetId || !playbackId || !parentPlaybackId || clipStartMs == null || clipEndMs == null || !clipperAddress) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        hint: "assetId, playbackId, parentPlaybackId, clipStartMs, clipEndMs, clipperAddress are required",
      },
      { status: 400 }
    );
  }
  if (!ADDRESS_REGEX.test(clipperAddress)) {
    return NextResponse.json({ error: "Invalid clipperAddress format" }, { status: 400 });
  }

  try {
    if(resolveVideoProviderId()==='frameworks') {
      const {address}=await requireWalletAuthFor(request,clipperAddress);
      const db=createServiceClient();
      const {data:authority,error:accessError}=await db.from('frameworks_vod_access')
        .select('asset_id,playback_id,creator_id,parent_stream_id').eq('asset_id',assetId).maybeSingle();
      if(accessError) throw new Error('Clip authority unavailable');
      if(!authority?.parent_stream_id || authority.playback_id!==playbackId || authority.creator_id!==address)
        return NextResponse.json({error:'Protected clip not found'},{status:404});
      const {data:clip,error}=await db.from('video_assets').select('*').eq('asset_id',assetId)
        .eq('playback_id',playbackId).eq('creator_id',address).eq('parent_playback_id',parentPlaybackId).eq('source_type','Clip').maybeSingle();
      if(error) throw new Error('Clip catalog unavailable');
      if(!clip) return NextResponse.json({error:'Protected clip not found'},{status:404});
      return NextResponse.json({clip},{headers:{'Cache-Control':'private, no-store'}});
    }
    const [clipThumb, parentStream] = await Promise.all([
      getClipThumbnailUrl(playbackId),
      getStreamByPlaybackId(parentPlaybackId),
    ]);
    const resolvedThumbnail = clipThumb ?? parentStream?.thumbnail_url ?? null;

    const row = await createClipVideoAsset({
      assetId,
      playbackId,
      playbackUrl: playbackUrl ?? null,
      thumbnailUrl: resolvedThumbnail,
      name: name ?? null,
      parentPlaybackId,
      parentStoryIpId: parentStoryIpId ?? null,
      clipStartMs: Number(clipStartMs),
      clipEndMs: Number(clipEndMs),
      clipperAddress,
    });
    return NextResponse.json({ clip: row });
  } catch (e: any) {
    if(e instanceof WalletAuthError) return NextResponse.json({error:e.message},{status:e.status});
    serverLogger.error("Failed to persist clip video asset");
    return NextResponse.json(
      { error: "Failed to persist clip" },
      { status: 500 }
    );
  }
}

export async function POST(request:NextRequest) {
 const started=performance.now();
 let outcome='error';
 try {
  const response=await handleClip(request);
  outcome=response.status<400?'success':response.status<500?'denied':'error';
  return response;
 } finally {
  metric('creative.clips.requests',1,{operation:'catalog',outcome});
  metric('creative.clips.duration_ms',performance.now()-started,{operation:'catalog',outcome});
 }
}
