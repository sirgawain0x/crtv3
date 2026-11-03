export const DEFAULT_DEAR_CREATIVE_ORIGIN = "https://news.creativeplatform.xyz";

export function getDearCreativeOrigin(): string {
  const configured = process.env.DEAR_CREATIVE_ORIGIN?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return DEFAULT_DEAR_CREATIVE_ORIGIN;
      }
      const withoutTrailingSlash = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
      return withoutTrailingSlash || parsed.origin;
    } catch {
      return DEFAULT_DEAR_CREATIVE_ORIGIN;
    }
  }
  return DEFAULT_DEAR_CREATIVE_ORIGIN;
}

export function buildDearCreativePostUrl(origin: string, slug: string): string {
  const base = origin.replace(/\/+$/, "");
  const path = encodeURIComponent(slug.replace(/^\/+/, ""));
  return `${base}/posts/${path}`;
}
