import { getVideoProvider } from "@/lib/video-provider";
export type {
  AssetSummary as LivepeerAssetSummary,
  AssetSource as LivepeerAssetSource,
  CreateStreamParams as CreateLivepeerStreamParams,
  CreatedStream as CreatedLivepeerStream,
  StreamSession as LivepeerStreamSession,
  StreamSummary as LivepeerStreamSummary,
} from "@/lib/video-provider/types";

/**
 * GET /api/stream/{id}. Returns null when the stream is missing (404 / not found).
 * Throws on auth misconfiguration or unexpected upstream errors.
 */
export async function getLivepeerStreamOrNull(
  streamId: string,
): Promise<import("@/lib/video-provider/types").StreamSummary | null> {
  return getVideoProvider().streams.getOrNull(streamId);
}

/** POST /api/stream — create a new Livepeer stream for a creator. */
export async function createLivepeerStream(
  params: import("@/lib/video-provider/types").CreateStreamParams,
): Promise<import("@/lib/video-provider/types").CreatedStream> {
  return getVideoProvider().streams.create(params);
}

export async function enableStreamRecording(
  streamId: string,
  record: boolean = true,
): Promise<void> {
  return getVideoProvider().streams.setRecording(streamId, record);
}

export async function getStreamSessions(
  streamId: string,
  options?: { record?: boolean },
): Promise<import("@/lib/video-provider/types").StreamSession[]> {
  return getVideoProvider().streams.getSessions(streamId, options);
}

export async function getLivepeerAsset(
  assetId: string,
): Promise<import("@/lib/video-provider/types").AssetSummary | null> {
  return getVideoProvider().assets.get(assetId);
}

export async function listRecentRecordingAssets(
  limit = 20,
): Promise<import("@/lib/video-provider/types").AssetSummary[]> {
  return getVideoProvider().assets.listRecentRecordings(limit);
}
