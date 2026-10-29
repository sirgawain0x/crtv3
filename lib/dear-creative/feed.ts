import type { DearCreativePost, DearCreativePublicStats } from "./types";
import { buildDearCreativePostUrl } from "./origin";

type FetchLike = typeof fetch;

function extractXmlTag(block: string, tag: string): string | undefined {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdataMatch = block.match(cdata);
  if (cdataMatch?.[1]) {
    return cdataMatch[1].trim();
  }
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const plainMatch = block.match(plain);
  return plainMatch?.[1]?.trim();
}

function slugFromPostLink(link: string, origin: string): string | null {
  try {
    const url = new URL(link);
    const base = origin.replace(/\/+$/, "");
    const originUrl = new URL(base);
    if (url.origin !== originUrl.origin) {
      return null;
    }
    const match = url.pathname.match(/\/posts\/([^/]+)\/?$/i);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
    const legacy = url.pathname.match(/^\/([^/]+)\/?$/);
    if (legacy?.[1] && legacy[1] !== "posts") {
      return decodeURIComponent(legacy[1]);
    }
  } catch {
    return null;
  }
  return null;
}

function normalizePost(raw: Record<string, unknown>, origin: string): DearCreativePost | null {
  const slug = typeof raw.slug === "string" ? raw.slug : "";
  const title = typeof raw.title === "string" ? raw.title : "";
  if (!slug || !title) {
    return null;
  }

  let publishedAt = "";
  if (typeof raw.publishedAt === "string") {
    publishedAt = raw.publishedAt;
  } else if (typeof raw.publishedAt === "number") {
    publishedAt = new Date(raw.publishedAt).toISOString();
  }

  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t): t is string => typeof t === "string")
    : undefined;

  const category =
    typeof raw.category === "string"
      ? raw.category
      : typeof raw.tag === "string"
        ? raw.tag
        : undefined;

  const canonicalUrl =
    typeof raw.canonicalUrl === "string" && raw.canonicalUrl
      ? raw.canonicalUrl
      : buildDearCreativePostUrl(origin, slug);

  return {
    slug,
    title,
    publishedAt,
    excerpt: typeof raw.excerpt === "string" ? raw.excerpt : undefined,
    coverImage:
      typeof raw.coverImage === "string"
        ? raw.coverImage
        : typeof raw.cover_image === "string"
          ? raw.cover_image
          : undefined,
    canonicalUrl,
    isGated: typeof raw.isGated === "boolean" ? raw.isGated : undefined,
    tags,
    category,
  };
}

function normalizePostsPayload(data: unknown, origin: string): DearCreativePost[] {
  let items: unknown[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.posts)) {
      items = record.posts;
    } else if (Array.isArray(record.items)) {
      items = record.items;
    }
  }

  return items
    .map((item) =>
      item && typeof item === "object"
        ? normalizePost(item as Record<string, unknown>, origin)
        : null,
    )
    .filter((post): post is DearCreativePost => post !== null);
}

export function parseDearCreativeRss(xml: string, origin: string): DearCreativePost[] {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const posts: DearCreativePost[] = [];

  for (const block of itemBlocks) {
    const title = extractXmlTag(block, "title");
    const link = extractXmlTag(block, "link");
    if (!title || !link) {
      continue;
    }
    const slug = slugFromPostLink(link, origin);
    if (!slug) {
      continue;
    }
    const pubDate = extractXmlTag(block, "pubDate");
    const description = extractXmlTag(block, "description");
    const enclosure = block.match(/url="([^"]+)"/i)?.[1];

    posts.push({
      slug,
      title,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : "",
      excerpt: description,
      coverImage: enclosure,
      canonicalUrl: buildDearCreativePostUrl(origin, slug),
    });
  }

  return posts;
}

async function fetchJsonRecentPosts(
  origin: string,
  limit: number,
  fetchFn: FetchLike,
): Promise<DearCreativePost[] | null> {
  const url = `${origin.replace(/\/+$/, "")}/api/posts/recent?limit=${limit}`;
  const response = await fetchFn(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const posts = normalizePostsPayload(data, origin);
  return posts.length > 0 ? posts.slice(0, limit) : null;
}

async function fetchRssRecentPosts(
  origin: string,
  limit: number,
  fetchFn: FetchLike,
): Promise<DearCreativePost[] | null> {
  const url = `${origin.replace(/\/+$/, "")}/rss.xml`;
  const response = await fetchFn(url, {
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });

  if (!response.ok) {
    return null;
  }

  const xml = await response.text();
  const posts = parseDearCreativeRss(xml, origin);
  return posts.length > 0 ? posts.slice(0, limit) : null;
}

export async function fetchRecentDearCreativePosts(
  origin: string,
  limit: number,
  fetchFn: FetchLike = fetch,
): Promise<DearCreativePost[]> {
  try {
    const fromJson = await fetchJsonRecentPosts(origin, limit, fetchFn);
    if (fromJson) {
      return fromJson;
    }
  } catch {
    // fall through to RSS
  }

  try {
    const fromRss = await fetchRssRecentPosts(origin, limit, fetchFn);
    if (fromRss) {
      return fromRss;
    }
  } catch {
    // both failed
  }

  return [];
}

export async function fetchDearCreativePublicStats(
  origin: string,
  fetchFn: FetchLike = fetch,
): Promise<DearCreativePublicStats | null> {
  const url = `${origin.replace(/\/+$/, "")}/api/public/stats`;
  try {
    const response = await fetchFn(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as DearCreativePublicStats;
    if (
      data &&
      typeof data.activeSubscriberCount === "number" &&
      Number.isFinite(data.activeSubscriberCount)
    ) {
      return { activeSubscriberCount: data.activeSubscriberCount };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Music news filter (`app/news/music/page.tsx`):
 * 1. Post tag equal to "music" (case-insensitive), or category "music"
 * 2. Otherwise title or excerpt contains the keyword "music" (case-insensitive)
 */
export function filterMusicDearCreativePosts(posts: DearCreativePost[]): DearCreativePost[] {
  return posts.filter((post) => isMusicDearCreativePost(post));
}

export function isMusicDearCreativePost(post: DearCreativePost): boolean {
  const tags = post.tags ?? [];
  if (tags.some((tag) => tag.toLowerCase() === "music")) {
    return true;
  }
  if (post.category?.toLowerCase() === "music") {
    return true;
  }
  const haystack = `${post.title} ${post.excerpt ?? ""}`.toLowerCase();
  return haystack.includes("music");
}

export function formatDearCreativeSubscriberLine(count: number): string {
  return `Join ${count.toLocaleString()} creatives reading Dear Creative`;
}

export function shouldShowSubscriberContentBadge(isGated?: boolean): boolean {
  return isGated === true;
}
