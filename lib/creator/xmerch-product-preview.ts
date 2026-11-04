import dns from "node:dns";
import {
  featuredProductLabel,
  isAllowedXmerchHostname,
  MAX_XMERCH_FEATURED_PRODUCTS,
  normalizeXmerchStoreUrl,
} from "@/lib/creator/xmerch-profile";

export type XmerchProductPreview = {
  title: string;
  imageUrl: string | null;
};

const XMERCH_FETCH_TIMEOUT_MS = 8_000;
const XMERCH_MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECT_HOPS = 3;

function isPrivateIp(ip: string): boolean {
  if (
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("0.")
  ) {
    return true;
  }
  if (ip.startsWith("172.")) {
    const second = Number.parseInt(ip.split(".")[1] ?? "", 10);
    if (second >= 16 && second <= 31) {
      return true;
    }
  }
  if (
    ip === "::1" ||
    ip.startsWith("fe80:") ||
    ip.startsWith("fc00:") ||
    ip.startsWith("fd00:")
  ) {
    return true;
  }
  return false;
}

function isIpLiteralHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) {
    return true;
  }
  if (host.includes(":")) {
    return true;
  }
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isBlockedFetchHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "[::1]"
  );
}

/** Validates HTTPS xMerch hosts and rejects private/link-local targets (SSRF). */
export async function isSafeXmerchFetchUrl(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }
  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    isBlockedFetchHostname(hostname) ||
    isIpLiteralHostname(hostname) ||
    !isAllowedXmerchHostname(hostname)
  ) {
    return false;
  }

  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (addresses.length === 0) {
      return false;
    }
    if (addresses.some(({ address }) => isPrivateIp(address))) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

async function fetchXmerchHtml(startUrl: string): Promise<string | null> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    if (!(await isSafeXmerchFetchUrl(current))) {
      return null;
    }

    const response = await fetch(current, {
      headers: {
        "User-Agent": "CreativeTV-xMerchPreview/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(XMERCH_FETCH_TIMEOUT_MS),
      redirect: "manual",
      next: { revalidate: 3600 },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return null;
      }
      current = new URL(location, current).href;
      continue;
    }

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      return null;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > XMERCH_MAX_HTML_BYTES) {
      return null;
    }

    const html = await response.text();
    if (html.length > XMERCH_MAX_HTML_BYTES) {
      return null;
    }

    return html;
  }

  return null;
}

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

    const html = await fetchXmerchHtml(pageUrl);
    if (!html) {
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
