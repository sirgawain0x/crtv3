import { NextRequest, NextResponse } from "next/server";
import {
  extractAssetFromWebhook,
  extractAssetIdFromWebhook,
  extractStreamIdFromWebhook,
  type LivepeerWebhookPayload,
} from "@/lib/livepeer/parse-webhook-event";
import { verifyLivepeerWebhookSignature } from "@/lib/livepeer/verify-webhook";
import { getLivepeerAsset } from "@/lib/livepeer/studio-api";
import {
  finalizeStreamRecordings,
  persistRecordingAsset,
} from "@/services/livestream-recordings";
import { serverLogger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("Livepeer-Signature");

  if (!verifyLivepeerWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LivepeerWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event;
  const streamId = extractStreamIdFromWebhook(payload);

  try {
    if (event === "asset.ready") {
      let asset = extractAssetFromWebhook(payload);
      if (!asset?.id) {
        const assetId = extractAssetIdFromWebhook(payload);
        if (assetId) {
          asset = (await getLivepeerAsset(assetId)) ?? undefined;
        }
      }
      if (asset?.id) {
        await persistRecordingAsset(asset, { streamId });
      }
    } else if (event === "recording.ready" || event === "stream.idle") {
      if (streamId) {
        await finalizeStreamRecordings(streamId);
      }
    }
  } catch (err) {
    serverLogger.error("Livepeer webhook handler error", { event, streamId, err });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
