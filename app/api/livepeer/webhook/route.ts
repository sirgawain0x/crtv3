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
import {
  markStreamLiveByStreamId,
  markStreamOfflineByStreamId,
} from "@/services/streams";
import { serverLogger } from "@/lib/utils/logger";
import { resolveVideoProviderId } from "@/lib/video-provider/config";
import { verifyFrameworksWebhookSignature } from "@/lib/video-provider/frameworks/webhooks";
import {
  handleFrameworksWebhookEvent,
  type FrameworksWebhookEvent,
} from "@/lib/video-provider/frameworks/handle-frameworks-webhook";

function headerRecord(request: NextRequest): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
    out[key] = request.headers.get(key);
  }
  return out;
}

async function handleLivepeerWebhook(
  rawBody: string,
  payload: LivepeerWebhookPayload,
): Promise<NextResponse> {
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
    } else if (event === "stream.started") {
      if (streamId) {
        await markStreamLiveByStreamId(streamId);
        serverLogger.info("Marked stream live from stream.started webhook", { streamId });
      }
    } else if (event === "recording.ready" || event === "stream.idle") {
      if (streamId) {
        if (event === "stream.idle") {
          await markStreamOfflineByStreamId(streamId);
          serverLogger.info("Marked stream offline from stream.idle webhook", { streamId });
        }
        await finalizeStreamRecordings(streamId);
      }
    }
  } catch (err) {
    serverLogger.error("Livepeer webhook handler error", { event, streamId, err });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleFrameworksWebhook(
  rawBody: string,
  request: NextRequest,
): Promise<NextResponse> {
  if (!verifyFrameworksWebhookSignature(rawBody, headerRecord(request))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: FrameworksWebhookEvent;
  try {
    event = JSON.parse(rawBody) as FrameworksWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleFrameworksWebhookEvent(event);
    if (result === "duplicate") {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    serverLogger.error("FrameWorks webhook handler error", {
      type: event.type,
      eventId: event.id,
      err,
    });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const providerId = resolveVideoProviderId();

  if (providerId === "frameworks") {
    return handleFrameworksWebhook(rawBody, request);
  }

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

  return handleLivepeerWebhook(rawBody, payload);
}
