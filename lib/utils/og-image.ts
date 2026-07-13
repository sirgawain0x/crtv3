/**
 * Same-origin OG/Twitter image URLs for video share previews.
 * Crawlers fetch these; the /api/og/video route proxies (or falls back) the real thumbnail.
 */

export function getSiteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://tv.creativeplatform.xyz";
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
  type: "image/jpeg",
} as const;
