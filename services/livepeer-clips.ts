import { getVideoProvider } from "@/lib/video-provider";
import { getStreamByPlaybackId } from "@/services/streams";

/**
 * Best-effort server-side lookup for a Livepeer asset's thumbnail URL.
 * Returns null if the asset isn't ready yet or no thumbnail source is published.
 */
export async function getClipThumbnailUrl(playbackId: string): Promise<string | null> {
  if (!playbackId) return null;
  try {
    const response = await getVideoProvider().playback.get(playbackId);
    const sources = (response.playbackInfo?.meta?.source ??
      []) as Array<{
      type?: string;
      hrn?: string;
      url?: string;
    }>;
    const thumbnail = sources.find(
      (src) => src.type === "image/png" && src.hrn === "Thumbnail (PNG)"
    );
    return thumbnail?.url ?? null;
  } catch {
    return null;
  }
}

export async function createClip({
  playbackId,
  sessionId,
  startTime,
  endTime,
  name,
}: {
  playbackId: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  name?: string;
}): Promise<{ playbackUrl: string; assetId: string; newPlaybackId: string; error?: string }> {
  if (!playbackId || !sessionId || !startTime || !endTime)
    return { playbackUrl: "", assetId: "", newPlaybackId: "", error: "Missing required fields" };
  try {
    const provider = getVideoProvider();
    const stream = provider.id === "frameworks"
      ? await getStreamByPlaybackId(playbackId)
      : null;
    if (provider.id === "frameworks" && !stream?.stream_id) {
      throw new Error("Stream not found for playback ID");
    }
    return await provider.streams.createClip({
      streamId: stream?.stream_id,
      playbackId,
      sessionId,
      startTime,
      endTime,
      name,
    });
  } catch (e: unknown) {
    return {
      playbackUrl: "",
      assetId: "",
      newPlaybackId: "",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
