import {
  featuredProductLabel,
  MAX_XMERCH_FEATURED_PRODUCTS,
  normalizeXmerchStoreUrl,
} from "@/lib/creator/xmerch-profile";

export type XmerchProductPreview = {
  title: string;
  imageUrl: string | null;
};

function extractMeta(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function resolvePreviewImage(raw: string | undefined, pageUrl: string): string | null {
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw, pageUrl).href;
  } catch {
    return null;
  }
}

/** Best-effort Open Graph preview for an xMerch product page (server-only). */
export async function fetchXmerchProductPreview(
  productUrl: string,
): Promise<XmerchProductPreview> {
  const fallbackTitle = featuredProductLabel(productUrl);
  const normalized = normalizeXmerchStoreUrl(productUrl);
  if (!normalized.ok || !normalized.url) {
    return { title: fallbackTitle, imageUrl: null };
  }

  const pageUrl = normalized.url;
  try {
    const parsed = new URL(pageUrl);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") {
      return { title: fallbackTitle, imageUrl: null };
    }

    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent": "CreativeTV-xMerchPreview/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return { title: fallbackTitle, imageUrl: null };
    }

    const html = await response.text();
    if (html.length > 2 * 1024 * 1024) {
      return { title: fallbackTitle, imageUrl: null };
    }

    const ogTitle = extractMeta(html, "og:title");
    const title =
      ogTitle ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      fallbackTitle;
    const imageUrl = resolvePreviewImage(extractMeta(html, "og:image"), pageUrl);

    return { title, imageUrl };
  } catch {
    return { title: fallbackTitle, imageUrl: null };
  }
}

export async function fetchXmerchProductPreviews(
  productUrls: readonly string[],
): Promise<Record<string, XmerchProductPreview>> {
  const limited = productUrls.slice(0, MAX_XMERCH_FEATURED_PRODUCTS);
  const pairs = await Promise.all(
    limited.map(async (url) => [url, await fetchXmerchProductPreview(url)] as const),
  );
  return Object.fromEntries(pairs);
}
