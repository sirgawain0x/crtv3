import { NextRequest, NextResponse } from "next/server";

type LinkPreview = {
  title?: string;
  description?: string;
  image?: string;
  domain: string;
};

const CACHE = new Map<string, { data: LinkPreview; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

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
    if (match?.[1]) return match[1].trim();
  }

  return undefined;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host === "0.0.0.0" ||
    host === "[::1]"
  );
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Blocked url" }, { status: 400 });
  }

  const cached = CACHE.get(rawUrl);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(rawUrl, {
      headers: {
        "User-Agent": "CreativeTV-LinkPreview/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch url" }, { status: 502 });
    }

    const html = await response.text();
    const title =
      extractMeta(html, "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const description =
      extractMeta(html, "og:description") || extractMeta(html, "description");
    const image = extractMeta(html, "og:image");

    const data: LinkPreview = {
      title,
      description,
      image,
      domain: parsed.hostname,
    };

    CACHE.set(rawUrl, { data, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 502 });
  }
}
