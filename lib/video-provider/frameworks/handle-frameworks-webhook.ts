import type { AssetSummary } from "../types";
import { getVideoProvider } from "../index";
import { claimFrameworksWebhookEvent } from "./webhook-dedupe";
import {
  finalizeStreamRecordings,
  persistRecordingAsset,
} from "@/services/livestream-recordings";
import {
  markStreamLiveByStreamId,
  markStreamOfflineByStreamId,
} from "@/services/streams";
import { serverLogger } from "@/lib/utils/logger";

export type FrameworksWebhookEvent = {
  id: string;
  type: string;
  api_version?: string;
  created_at?: string;
  data: Record<string, unknown>;
};

type ArtifactHandleResult = "processed" | "duplicate" | "ignored";

function readString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function extractArtifactId(data: Record<string, unknown>): string | undefined {
  const artifact = data.artifact;
  if (artifact && typeof artifact === "object") {
    const artifactId = (artifact as { artifactId?: string }).artifactId;
    if (typeof artifactId === "string" && artifactId.trim()) return artifactId.trim();
  }
  return undefined;
}

async function resolveAssetFromArtifact(
  artifactId: string,
): Promise<{ asset: AssetSummary; streamId?: string } | null> {
  const asset = await getVideoProvider().assets.get(artifactId);
  if (!asset?.id || !asset.playbackId) return null;
  return { asset, streamId: asset.source?.streamId };
}

async function handleArtifactReadyEvent(
  data: Record<string, unknown>,
  eventType: string,
): Promise<void> {
  const artifactId = extractArtifactId(data);
  if (!artifactId) {
    serverLogger.warn("FrameWorks webhook missing artifactId", { eventType });
    return;
  }

  const resolved = await resolveAssetFromArtifact(artifactId);
  if (!resolved) {
    serverLogger.warn("FrameWorks webhook could not resolve artifact playback", {
      eventType,
      artifactId,
    });
    return;
  }

  const streamId = readString(data, "streamId") ?? resolved.streamId;
  if (eventType === "recording.ready" && resolved.asset.status?.phase === "ready") {
    await persistRecordingAsset(resolved.asset, { streamId });
  }
}

export async function handleFrameworksWebhookEvent(
  event: FrameworksWebhookEvent,
): Promise<ArtifactHandleResult> {
  if (!event.id?.trim()) {
    throw new Error("Missing webhook event id");
  }
  if (!claimFrameworksWebhookEvent(event.id)) {
    return "duplicate";
  }

  const type = event.type;
  const data = event.data ?? {};

  if (type === "stream.live") {
    const streamId = readString(data, "streamId");
    if (streamId) {
      await markStreamLiveByStreamId(streamId);
      serverLogger.info("Marked stream live from stream.live webhook", { streamId });
    }
    return "processed";
  }

  if (type === "stream.idle") {
    const streamId = readString(data, "streamId");
    if (streamId) {
      await markStreamOfflineByStreamId(streamId);
      serverLogger.info("Marked stream offline from stream.idle webhook", { streamId });
      await finalizeStreamRecordings(streamId);
    }
    return "processed";
  }

  if (type === "recording.ready" || type === "clip.ready" || type === "upload.ready") {
    await handleArtifactReadyEvent(data, type);
    return "processed";
  }

  return "ignored";
}
