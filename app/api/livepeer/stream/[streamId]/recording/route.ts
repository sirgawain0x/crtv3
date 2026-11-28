import { frameworksReplayEnabled, resolveVideoProviderId } from "@/lib/video-provider/config";
import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";
import { NextRequest, NextResponse } from "next/server";
import { requireHumanOrVerifiedBot } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { enableStreamRecording } from "@/lib/livepeer/studio-api";
import { requireWalletAuth, WalletAuthError } from "@/lib/auth/require-wallet";
import { isPermittedSigner } from "@/lib/utils/linked-identity";
import { createServiceClient } from "@/lib/sdk/supabase/service";
import { serverLogger } from "@/lib/utils/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const botCheck = await requireHumanOrVerifiedBot("stream-recording", request);
  if (!botCheck.allowed) return botCheck.response;
  const limited = await rateLimiters.standard(request);
  if (limited) return withPlatformApiPaymentHeaders(limited, botCheck);

  try {
    const { address: caller } = await requireWalletAuth(request);
    const { streamId } = await params;
    if (!streamId?.trim()) {
      return withPlatformApiPaymentHeaders(NextResponse.json({ error: "streamId is required" }, { status: 400 }), botCheck);
    }
    const body = await request.json().catch(() => null);
    if (typeof body?.record !== "boolean") {
      return withPlatformApiPaymentHeaders(NextResponse.json({ error: "record must be a boolean" }, { status: 400 }), botCheck);
    }
    const database = await createServiceClient();
    const { data: stream, error: lookupError } = await database
      .from("streams")
      .select("id, creator_id, stream_id, updated_at")
      .eq("stream_id", streamId.trim())
      .maybeSingle();
    if (lookupError) throw new Error("Stream lookup failed");
    if (!stream) return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Stream not found" }, { status: 404 }), botCheck);
    const owner = stream.creator_id.toLowerCase();
    if (caller !== owner &&
        !(await isPermittedSigner(owner, caller)) &&
        !(await isPermittedSigner(caller, owner))) {
      return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Not authorized to modify this stream" }, { status: 403 }), botCheck);
    }

    if (body.record && resolveVideoProviderId() === "frameworks" && !frameworksReplayEnabled()) {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        { error: "New live stream replays are temporarily unavailable." },
        { status: 409 },
      ), botCheck);
    }

    // Never persist a preference that the provider rejected. If persistence
    // subsequently fails, report failure rather than claiming both were saved.
    await enableStreamRecording(stream.stream_id, body.record);
    const { data: saved, error: saveError } = await database
      .from("streams")
      .update({ save_recording: body.record, updated_at: new Date().toISOString() })
      .eq("id", stream.id)
      .eq("stream_id", stream.stream_id)
      .eq("updated_at", stream.updated_at)
      .select("id")
      .maybeSingle();
    if (saveError || !saved) throw new Error("Recording preference persistence failed");
    return withPlatformApiPaymentHeaders(NextResponse.json({ ok: true, record: body.record }), botCheck);
  } catch (error) {
    if (error instanceof WalletAuthError) {
      return withPlatformApiPaymentHeaders(NextResponse.json({ error: error.message }, { status: error.status }), botCheck);
    }
    serverLogger.error("Failed to update stream recording settings");
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Could not confirm recording settings. Refresh and try again." },
      { status: 502 },
    ), botCheck);
  }
}
