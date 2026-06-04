/** Livepeer asset UUID used in /discover/{assetId} URLs. */
export const CREATIVE_TV_ASSET_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedCreativeTVUrl =
  | {
      kind: "discover";
      assetId: string;
      fallbackUrl: string;
    }
  | {
      kind: "watch";
      playbackId: string;
      fallbackUrl: string;
    }
  | {
      kind: "invalid";
      raw: string;
    };

const DISCOVER_PATH_REGEX =
  /\/discover\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:[/?#]|$)/i;

const WATCH_PATH_REGEX = /\/watch\/([^/?#]+)(?:[/?#]|$)/i;

function normalizeInput(raw: string): string {
  return raw.trim();
}

function toAbsoluteFallbackUrl(pathOrUrl: string, origin?: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "https://tv.creativeplatform.xyz");

  return `${base.replace(/\/$/, "")}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

/**
 * Parse a Creative TV discover or watch URL/path into a structured result.
 * Accepts absolute URLs, relative paths, or bare UUID / playbackId strings.
 */
export function parseCreativeTVUrl(
  input: string,
  opts?: { origin?: string },
): ParsedCreativeTVUrl {
  const raw = normalizeInput(input);
  if (!raw) {
    return { kind: "invalid", raw };
  }

  const discoverMatch = raw.match(DISCOVER_PATH_REGEX);
  if (discoverMatch?.[1]) {
    const assetId = discoverMatch[1];
    const fallbackUrl = toAbsoluteFallbackUrl(`/discover/${assetId}`, opts?.origin);
    return { kind: "discover", assetId, fallbackUrl };
  }

  const watchMatch = raw.match(WATCH_PATH_REGEX);
  if (watchMatch?.[1]) {
    const playbackId = watchMatch[1];
    const fallbackUrl = toAbsoluteFallbackUrl(`/watch/${playbackId}`, opts?.origin);
    return { kind: "watch", playbackId, fallbackUrl };
  }

  if (CREATIVE_TV_ASSET_UUID_REGEX.test(raw)) {
    const fallbackUrl = toAbsoluteFallbackUrl(`/discover/${raw}`, opts?.origin);
    return { kind: "discover", assetId: raw, fallbackUrl };
  }

  return { kind: "invalid", raw };
}

/** Lightweight iframe-safe embed URL for a discover asset id. */
export function getCreativeTVEmbedDiscoverUrl(
  assetId: string,
  opts?: { origin?: string },
): string {
  return toAbsoluteFallbackUrl(`/embed/discover/${assetId}`, opts?.origin);
}

/**
 * Embed URL suitable for iframes when resolution falls back to the full discover page.
 */
export function getCreativeTVEmbedUrlForParsed(
  parsed: ParsedCreativeTVUrl,
  opts?: { origin?: string },
): string | undefined {
  if (parsed.kind === "discover") {
    return getCreativeTVEmbedDiscoverUrl(parsed.assetId, opts);
  }
  if (parsed.kind === "watch") {
    return toAbsoluteFallbackUrl(`/watch/${parsed.playbackId}`, opts?.origin);
  }
  return undefined;
}
