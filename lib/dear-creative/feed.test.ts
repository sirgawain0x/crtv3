import { describe, expect, it, vi } from "vitest";
import {
  fetchRecentDearCreativePosts,
  filterMusicDearCreativePosts,
  parseDearCreativeRss,
  shouldShowSubscriberContentBadge,
} from "./feed";
import { buildDearCreativePostUrl } from "./origin";

const ORIGIN = "https://news.creativeplatform.xyz";

describe("fetchRecentDearCreativePosts", () => {
  it("returns posts from JSON when the recent API succeeds", async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("/api/posts/recent")) {
        return new Response(
          JSON.stringify([
            {
              slug: "hello-world",
              title: "Hello World",
              publishedAt: "2026-01-01T00:00:00.000Z",
              excerpt: "Intro",
              coverImage: "https://cdn.example/cover.jpg",
              isGated: false,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const posts = await fetchRecentDearCreativePosts(ORIGIN, 3, fetchFn as typeof fetch);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.slug).toBe("hello-world");
    expect(posts[0]?.canonicalUrl).toBe(buildDearCreativePostUrl(ORIGIN, "hello-world"));
    expect(fetchFn).toHaveBeenCalledWith(
      `${ORIGIN}/api/posts/recent?limit=3`,
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("falls back to RSS when JSON fails", async () => {
    const rss = `<?xml version="1.0"?>
<rss><channel>
<item>
<title>Music Weekly</title>
<link>${ORIGIN}/posts/music-weekly</link>
<pubDate>Wed, 01 Jan 2026 00:00:00 GMT</pubDate>
<description>Roundup</description>
</item>
</channel></rss>`;

    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("/api/posts/recent")) {
        return new Response("error", { status: 500 });
      }
      if (url.endsWith("/rss.xml")) {
        return new Response(rss, { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const posts = await fetchRecentDearCreativePosts(ORIGIN, 5, fetchFn as typeof fetch);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.slug).toBe("music-weekly");
    expect(posts[0]?.canonicalUrl).toBe(`${ORIGIN}/posts/music-weekly`);
  });

  it("returns an empty list when JSON and RSS both fail", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 503 }));
    const posts = await fetchRecentDearCreativePosts(ORIGIN, 3, fetchFn as typeof fetch);
    expect(posts).toEqual([]);
  });
});

describe("parseDearCreativeRss", () => {
  it("builds /posts/ canonical URLs from item links", () => {
    const xml = `<rss><channel><item>
<title>Onchain Beats</title>
<link>${ORIGIN}/posts/onchain-beats</link>
</item></channel></rss>`;
    const posts = parseDearCreativeRss(xml, ORIGIN);
    expect(posts[0]?.canonicalUrl).toBe(`${ORIGIN}/posts/onchain-beats`);
  });
});

describe("shouldShowSubscriberContentBadge", () => {
  it("shows the badge only for gated posts", () => {
    expect(shouldShowSubscriberContentBadge(true)).toBe(true);
    expect(shouldShowSubscriberContentBadge(false)).toBe(false);
    expect(shouldShowSubscriberContentBadge(undefined)).toBe(false);
  });
});

describe("filterMusicDearCreativePosts", () => {
  it("prefers tag/category music before keyword fallback", () => {
    const posts = filterMusicDearCreativePosts([
      { slug: "a", title: "Art", publishedAt: "", tags: ["music"] },
      { slug: "b", title: "Music in title", publishedAt: "" },
      { slug: "c", title: "Other", publishedAt: "", excerpt: "talks about music" },
      { slug: "d", title: "Sports", publishedAt: "" },
    ]);
    expect(posts.map((p) => p.slug)).toEqual(["a", "b", "c"]);
  });
});
