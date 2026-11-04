import {
  featuredProductLabel,
  MAX_XMERCH_FEATURED_PRODUCTS,
  normalizeXmerchStoreUrl,
} from "@/lib/creator/xmerch-profile";

export type XmerchProductPreview = {
  title: string;
  imageUrl: string | null;
};

/** Decode common HTML entities in OG meta values. */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
    const token = body.toLowerCase();
    if (token.startsWith("#x")) {
      const codePoint = Number.parseInt(token.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    if (token.startsWith("#")) {
      const codePoint = Number.parseInt(token.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    switch (token) {
      case "amp":
        return "&";
      case "apos":
        return "'";
      case "quot":
        return '"';
      case "lt":
        return "<";
      case "gt":
        return ">";
      default:
        return entity;
    }
  });
}

function readQuotedAttribute(tag: string, attributeName: string): string | undefined {
  const pattern = new RegExp(
    `${attributeName}\\s*=\\s*("([^"]*)"|'([^']*)')`,
    "i",
  );
  const match = tag.match(pattern);
  if (!match) {
    return undefined;
  }
  return match[2] ?? match[3];
}

function extractMeta(html: string, property: string): string | undefined {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const wanted = property.toLowerCase();

  for (const tag of metaTags) {
    const key =
      readQuotedAttribute(tag, "property") ?? readQuotedAttribute(tag, "name");
    if (!key || key.toLowerCase() !== wanted) {
      continue;
    }
    const content = readQuotedAttribute(tag, "content");
    if (content !== undefined) {
      return decodeHtmlEntities(content.trim());
    }
  }

  return undefined;
}

function resolvePreviewImage(raw: string | undefined, pageUrl: string): string | null {
  if (!raw) {
    return null;
  }
  const decoded = decodeHtmlEntities(raw);
  try {
    return new URL(decoded, pageUrl).href;
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
    const rawTitle =
      ogTitle || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const title = rawTitle ? decodeHtmlEntities(rawTitle) : fallbackTitle;
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
