import type { ParsedCreativeTVUrl } from "@/lib/utils/creative-tv-url";
import type { VideoAsset } from "@/lib/types/video-asset";
import {
  getVideoAssetByAssetId,
  getVideoAssetById,
  getVideoAssetByPlaybackId,
} from "@/services/video-assets";
import { serverLogger } from "@/lib/utils/logger";
import {
  CHONES_FAIR_VIDEO_REFERENCES,
  parseFairVideoReferences,
} from "@/lib/chones/fair-videos";

const VISIBLE_STATUSES = new Set<VideoAsset["status"]>(["published", "minted"]);

async function resolveParsedReference(
  parsed: ParsedCreativeTVUrl,
): Promise<VideoAsset | null> {
  if (parsed.kind === "discover") {
    const row = await getVideoAssetByAssetId(parsed.assetId);
    return row as VideoAsset | null;
  }

  if (parsed.kind !== "watch") {
    return null;
  }

  const partial = await getVideoAssetByPlaybackId(parsed.playbackId);
  if (!partial?.id) {
    return null;
  }
  const row = await getVideoAssetById(partial.id);
  return row as VideoAsset | null;
}

/** Load published video rows for the static FAIR config list (read-only). */
export async function loadChonesFairVideos(
  references: readonly string[] = CHONES_FAIR_VIDEO_REFERENCES,
): Promise<VideoAsset[]> {
  const parsedEntries = parseFairVideoReferences(references);
  const videos: VideoAsset[] = [];

  for (const entry of parsedEntries) {
    if (!entry.ok) {
      serverLogger.warn(
        "[chones/fair] skipping invalid reference:",
        entry.raw,
        entry.reason,
      );
      continue;
    }

    try {
      const asset = await resolveParsedReference(entry.parsed);
      if (!asset) {
        serverLogger.warn("[chones/fair] video not found for reference", entry.parsed);
        continue;
      }
      if (!VISIBLE_STATUSES.has(asset.status)) {
        serverLogger.warn(
          "[chones/fair] skipping non-public video",
          asset.id,
          asset.status,
        );
        continue;
      }
      videos.push(asset);
    } catch (error) {
      serverLogger.error("[chones/fair] failed to load video", error);
    }
  }

  return videos;
}
