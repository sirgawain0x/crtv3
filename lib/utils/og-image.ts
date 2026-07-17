/**
 * Same-origin OG/Twitter image URLs for video share previews.
 * Crawlers fetch these; the /api/og/video route proxies (or falls back) the real thumbnail.
 */

const PRODUCTION_SITE_ORIGIN = "https://tv.creativeplatform.xyz";

/**
 * Prefer configured public site URLs over VERCEL_URL so share cards always
 * point at the custom domain (crawlers often fail on *.vercel.app preview hosts).
 */
export function getSiteOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed.replace(/\/$/, "");
    }
  }

  return PRODUCTION_SITE_ORIGIN;
}

export type VideoOgImageParams = {
  id?: string | null;
  playbackId?: string | null;
};

/**
 * Absolute URL for the OG image proxy used in generateMetadata.
 */
export function getVideoOgImageUrl({
  id,
  playbackId,
}: VideoOgImageParams): string {
  const origin = getSiteOrigin();
  const params = new URLSearchParams();
  if (id) params.set("id", id);
  else if (playbackId) params.set("playbackId", playbackId);
  const qs = params.toString();
  return qs ? `${origin}/api/og/video?${qs}` : `${origin}/Creative_TV.png`;
}

export const VIDEO_OG_IMAGE = {
  width: 1200,
  height: 630,
  alt: "Creative TV video",
  // Proxied thumbnails vary (jpeg/png/webp); omit strict type in consumers when unsure.
  type: "image/jpeg",
} as const;
