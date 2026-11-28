import { metric } from '@vercel/functions';
import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";
import { NextRequest, NextResponse } from "next/server";
import { requireHumanOrVerifiedBot } from "@/lib/middleware/botIdGuard";
import { createClip } from "@/services/livepeer-clips";
import { getStreamByPlaybackId } from "@/services/streams";
import { serverLogger } from "@/lib/utils/logger";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { resolveVideoProviderId } from '@/lib/video-provider/config';
import { requireWalletAuthFor, WalletAuthError } from '@/lib/auth/require-wallet';
import { checkMeTokenAccess, isMeTokenGateActive } from '@/lib/utils/metoken-access';
import { resolveVerifiedViewerAddresses } from '@/lib/utils/linked-identity';
import { secureFrameworksClip } from '@/lib/video-provider/frameworks/clip-policy';
import { createServiceClient } from '@/lib/sdk/supabase/service';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const MAX_CLIP_SPAN_MS = 120_000;

async function handleClip(request: NextRequest) {
  const botCheck = await requireHumanOrVerifiedBot("livepeer-clips", request);
  if (!botCheck.allowed) {
    return botCheck.response;
  }

  const rl = await rateLimiters.strict(request);
  if (rl) return withPlatformApiPaymentHeaders(rl, botCheck);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }), botCheck);
  }

  const { playbackId, sessionId, startTime, endTime, name, clipperAddress } = body ?? {};

  if (!playbackId || !sessionId || startTime == null || endTime == null || !clipperAddress) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      {
        error: "Missing required fields",
        hint: "playbackId, sessionId, startTime, endTime, clipperAddress are required",
      },
      { status: 400 }
    ), botCheck);
  }

  if (typeof clipperAddress!=='string' || !ADDRESS_REGEX.test(clipperAddress) ||
      typeof playbackId!=='string' || !/^[A-Za-z0-9_-]{1,200}$/.test(playbackId) ||
      typeof sessionId!=='string' || sessionId.length>200) {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Invalid clipperAddress format" }, { status: 400 }), botCheck);
  }

  const start = Number(startTime);
  const end = Number(endTime);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || end <= start) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "startTime and endTime must be numbers with endTime > startTime" },
      { status: 400 }
    ), botCheck);
  }

  if (end - start > MAX_CLIP_SPAN_MS) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: `Clip span must be ≤ ${MAX_CLIP_SPAN_MS / 1000} seconds` },
      { status: 400 }
    ), botCheck);
  }

  const stream = await getStreamByPlaybackId(playbackId);
  if (!stream) {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Stream not found" }, { status: 404 }), botCheck);
  }
  if (stream.allow_clipping === false) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "The broadcaster has disabled clipping on this stream" },
      { status: 403 }
    ), botCheck);
  }

  try {
    const protectedClip = resolveVideoProviderId() === 'frameworks';
    let verifiedClipper = clipperAddress.toLowerCase();
    if (protectedClip) {
      if(!stream.creator_id || !stream.playback_id) throw new Error('Clip parent identity unavailable');
      const verified = await requireWalletAuthFor(request, clipperAddress);
      verifiedClipper = verified.address;
      if (isMeTokenGateActive(stream.requires_metoken, stream.metoken_price)) {
        const viewerAddresses = await resolveVerifiedViewerAddresses(verified.address, body.companionAddress);
        const access = await checkMeTokenAccess({ viewerAddresses, creatorAddress: stream.creator_id, requiredAmount: stream.metoken_price??null });
        if (!access.allowed) return withPlatformApiPaymentHeaders(NextResponse.json({error:'Broadcaster access is required to create this clip'}, {status:403}),botCheck);
      }
    }
    const result = await createClip({
      playbackId,
      sessionId,
      startTime: start,
      endTime: end,
      name: typeof name === "string" ? name.slice(0, 120) : undefined,
    });

    if (result.error) {
      return withPlatformApiPaymentHeaders(NextResponse.json({ error: 'Clip provider could not create the clip' }, { status: 502 }), botCheck);
    }

    if (protectedClip) {
      await secureFrameworksClip(result.assetId, result.newPlaybackId);
      const {error} = await createServiceClient().rpc('register_frameworks_clip', {
        p_asset_id:result.assetId,p_playback_id:result.newPlaybackId,p_owner:verifiedClipper,
        p_parent_stream_id:stream.id,p_parent_playback_id:stream.playback_id,
        p_expected_creator:stream.creator_id!.toLowerCase(),p_expected_gate:stream.requires_metoken??false,
        p_expected_price:stream.metoken_price??null,p_title:typeof name==='string'?name.slice(0,120):'',
        p_start_ms:start,p_end_ms:end,
      });
      if(error) throw new Error('Protected clip registration failed');
    }

    return withPlatformApiPaymentHeaders(NextResponse.json({
      playbackUrl: result.playbackUrl,
      assetId: result.assetId,
      newPlaybackId: result.newPlaybackId,
      parentPlaybackId: stream.playback_id??playbackId,
      parentStoryIpId: stream.story_ip_id ?? null,
      parentStoryLicenseTermsId: stream.story_license_terms_id ?? null,
      parentCreatorId: stream.creator_id ?? null,
      parentCommercialRevShare: stream.story_commercial_rev_share ?? null,
    }), botCheck);
  } catch (e: any) {
    if(e instanceof WalletAuthError) return withPlatformApiPaymentHeaders(NextResponse.json({error:e.message},{status:e.status}),botCheck);
    serverLogger.error("Clip creation failed");
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Failed to create protected clip" },
      { status: 500 }
    ), botCheck);
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
  metric('creative.clips.requests',1,{operation:'create',outcome});
  metric('creative.clips.duration_ms',performance.now()-started,{operation:'create',outcome});
 }
}
