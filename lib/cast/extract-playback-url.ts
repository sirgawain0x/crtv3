import type { Src } from "@livepeer/react";

const HLS_MIME = "application/x-mpegurl";
const HLS_MIME_ALT = "application/x-mpegURL";

function isHlsSource(source: Src): boolean {
  const type = (source.type as string | undefined)?.toLowerCase();
  const url = source.src?.toLowerCase() ?? "";
  return (
    type === HLS_MIME ||
    type === HLS_MIME_ALT.toLowerCase() ||
    url.includes(".m3u8")
  );
}

/**
 * Pick the best HLS URL from Livepeer playback sources for Cast / AirPlay.
 * Prefers explicit HLS mime types, then .m3u8 URLs, then first source.
 */
export function extractHlsPlaybackUrl(sources: Src[] | null | undefined): string | null {
  if (!sources?.length) return null;

  const hls = sources.find(isHlsSource);
  if (hls?.src) return hls.src;

  const m3u8 = sources.find((s) => s.src?.includes(".m3u8"));
  if (m3u8?.src) return m3u8.src;

  return sources[0]?.src ?? null;
}

/**
 * Livepeer CDN host patterns that serve castable HLS without DRM.
 */
export const CASTABLE_LIVEPEER_HOST_SUFFIXES = [
  "livepeercdn.studio",
  "lp-playback.studio",
  "cdn.livepeer.studio",
  "livepeer.com",
] as const;

export function isCastableLivepeerHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return CASTABLE_LIVEPEER_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function isHttpsCastableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isCastableLivepeerHost(parsed.hostname);
  } catch {
    return false;
  }
}
