export const DEFAULT_DEAR_CREATIVE_ORIGIN = "https://news.creativeplatform.xyz";

export function getDearCreativeOrigin(): string {
  const configured = process.env.DEAR_CREATIVE_ORIGIN?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  return DEFAULT_DEAR_CREATIVE_ORIGIN;
}

export function buildDearCreativePostUrl(origin: string, slug: string): string {
  const base = origin.replace(/\/+$/, "");
  const path = slug.replace(/^\/+/, "");
  return `${base}/posts/${path}`;
}
