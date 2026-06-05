import { parseCreativeTVUrl, type ParsedCreativeTVUrl } from "@/lib/utils/creative-tv-url";
import {
  fetchPlaybackByAssetId,
  type VideoAssetPlaybackResponse,
} from "@/lib/utils/video-assets-client";

export type { VideoAssetPlaybackResponse as CreativeTVPlaybackResponse };

export type ResolveCreativeTVPlaybackResult =
  | {
      ok: true;
      playbackId: string;
      title?: string;
      thumbnailUri?: string;
      requiresMetoken: boolean;
      fallbackUrl: string;
      resolution: "direct" | "api";
      parsed: ParsedCreativeTVUrl;
    }
  | {
      ok: false;
      reason: "invalid_url" | "not_found" | "network_error";
      fallbackUrl?: string;
      parsed?: ParsedCreativeTVUrl;
      message?: string;
    };

export type ResolveCreativeTVPlaybackOptions = {
  /** API origin for cross-origin resolution (defaults to same-origin). */
  apiBaseUrl?: string;
  /** Site origin for fallback URLs when parsing relative paths. */
  siteOrigin?: string;
  signal?: AbortSignal;
};

/**
 * Resolve a pasted Creative TV discover or watch URL to a Livepeer playbackId.
 * Watch URLs resolve directly; discover URLs call the playback API.
 */
export async function resolveCreativeTVPlayback(
  input: string,
  opts?: ResolveCreativeTVPlaybackOptions,
): Promise<ResolveCreativeTVPlaybackResult> {
  const parsed = parseCreativeTVUrl(input, { origin: opts?.siteOrigin });

  if (parsed.kind === "invalid") {
    return { ok: false, reason: "invalid_url", parsed, message: "Unrecognized Creative TV URL" };
  }

  if (parsed.kind === "watch") {
    return {
      ok: true,
      playbackId: parsed.playbackId,
      fallbackUrl: parsed.fallbackUrl,
      requiresMetoken: false,
      resolution: "direct",
      parsed,
    };
  }

  try {
    const data = await fetchPlaybackByAssetId(parsed.assetId, {
      apiBaseUrl: opts?.apiBaseUrl,
      signal: opts?.signal,
    });

    if (!data?.playbackId) {
      return {
        ok: false,
        reason: "not_found",
        fallbackUrl: parsed.fallbackUrl,
        parsed,
        message: "Video not found or not published",
      };
    }

    return {
      ok: true,
      playbackId: data.playbackId,
      title: data.title,
      thumbnailUri: data.thumbnailUri,
      requiresMetoken: Boolean(data.requiresMetoken),
      fallbackUrl: data.fallbackUrl || parsed.fallbackUrl,
      resolution: "api",
      parsed,
    };
  } catch (error) {
    const isAbort =
      error instanceof DOMException && error.name === "AbortError" ||
      (error instanceof Error && error.name === "AbortError");

    if (isAbort) {
      throw error;
    }

    return {
      ok: false,
      reason: "network_error",
      fallbackUrl: parsed.fallbackUrl,
      parsed,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}
