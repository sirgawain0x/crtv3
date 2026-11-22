import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";
import { NextRequest, NextResponse } from "next/server";
import { requireHumanOrVerifiedBot } from "@/lib/middleware/botIdGuard";
import { createClip } from "@/services/livepeer-clips";
import { getStreamByPlaybackId } from "@/services/streams";
import { serverLogger } from "@/lib/utils/logger";
import { rateLimiters } from "@/lib/middleware/rateLimit";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const MAX_CLIP_SPAN_MS = 120_000;

export async function POST(request: NextRequest) {
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

  if (!ADDRESS_REGEX.test(clipperAddress)) {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Invalid clipperAddress format" }, { status: 400 }), botCheck);
  }

  const start = Number(startTime);
  const end = Number(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
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
    const result = await createClip({
      playbackId,
      sessionId,
      startTime: start,
      endTime: end,
      name: typeof name === "string" ? name.slice(0, 120) : undefined,
    });

    if (result.error) {
      return withPlatformApiPaymentHeaders(NextResponse.json({ error: result.error }, { status: 502 }), botCheck);
    }

    return withPlatformApiPaymentHeaders(NextResponse.json({
      playbackUrl: result.playbackUrl,
      assetId: result.assetId,
      newPlaybackId: result.newPlaybackId,
      parentPlaybackId: playbackId,
      parentStoryIpId: stream.story_ip_id ?? null,
      parentStoryLicenseTermsId: stream.story_license_terms_id ?? null,
      parentCreatorId: stream.creator_id ?? null,
      parentCommercialRevShare: stream.story_commercial_rev_share ?? null,
    }), botCheck);
  } catch (e: any) {
    serverLogger.error("Clip creation failed:", e);
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: e?.message || "Failed to create clip" },
      { status: 500 }
    ), botCheck);
  }
}
