import { NextRequest, NextResponse } from "next/server";
import { verifyLivepeerWebhookSignature } from "@/lib/livepeer/verify-webhook";
import {
  getLivepeerAsset,
  type LivepeerAssetSummary,
} from "@/lib/livepeer/studio-api";
import {
  finalizeStreamRecordings,
  persistRecordingAsset,
} from "@/services/livestream-recordings";
import { serverLogger } from "@/lib/utils/logger";

type WebhookPayload = {
  event?: string;
  streamId?: string;
  asset?: LivepeerAssetSummary;
  assetId?: string;
  session?: { id?: string };
  sessionId?: string;
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("Livepeer-Signature");

  if (!verifyLivepeerWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event;
  const streamId = payload.streamId;

  try {
    if (event === "asset.ready") {
      let asset = payload.asset;
      if (!asset?.id && payload.assetId) {
        asset = (await getLivepeerAsset(payload.assetId)) ?? undefined;
      }
      if (asset?.id) {
        await persistRecordingAsset(asset, { streamId });
      }
    } else if (
      event === "recording.ready" ||
      event === "stream.idle"
    ) {
      if (streamId) {
        await finalizeStreamRecordings(streamId);
      }
    }
  } catch (err) {
    serverLogger.error("Livepeer webhook handler error", { event, err });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
