import { describe, expect, it, vi } from "vitest";
import {
  fetchRecentDearCreativePosts,
  filterMusicDearCreativePosts,
  isTrustedDearCreativeCanonicalUrl,
  parseDearCreativeRss,
  resolveDearCreativeCanonicalUrl,
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

  it("falls back to RSS when the JSON request hangs until timeout", async () => {
    const rss = `<?xml version="1.0"?>
<rss><channel>
<item>
<title>After Timeout</title>
<link>${ORIGIN}/posts/after-timeout</link>
<pubDate>Wed, 01 Jan 2026 00:00:00 GMT</pubDate>
</item>
</channel></rss>`;

    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/api/posts/recent")) {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("expected AbortSignal"));
            return;
          }
          if (signal.aborted) {
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
            return;
          }
          signal.addEventListener("abort", () => {
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
          });
        });
      }
      if (url.endsWith("/rss.xml")) {
        return new Response(rss, { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    // Production uses 5000ms; inject a short timeout so abort is deterministic
    // without racing vitest's default 5000ms test limit (AbortSignal.timeout
    // is not driven by vi.useFakeTimers in Node).
    const posts = await fetchRecentDearCreativePosts(
      ORIGIN,
      3,
      fetchFn as typeof fetch,
      50,
    );

    expect(posts).toHaveLength(1);
    expect(posts[0]?.slug).toBe("after-timeout");
    expect(fetchFn).toHaveBeenCalledWith(
      `${ORIGIN}/api/posts/recent?limit=3`,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("uses trusted https canonical URLs on the Dear Creative origin", async () => {
    const trusted = `${ORIGIN}/posts/trusted-slug`;
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("/api/posts/recent")) {
        return new Response(
          JSON.stringify([
            {
              slug: "trusted-slug",
              title: "Trusted",
              publishedAt: "2026-01-01T00:00:00.000Z",
              canonicalUrl: trusted,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const posts = await fetchRecentDearCreativePosts(ORIGIN, 3, fetchFn as typeof fetch);
    expect(posts[0]?.canonicalUrl).toBe(trusted);
  });

  it("rejects foreign, http, and javascript canonical URLs", async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("/api/posts/recent")) {
        return new Response(
          JSON.stringify([
            {
              slug: "evil-a",
              title: "A",
              publishedAt: "",
              canonicalUrl: "https://evil.example/phish",
            },
            {
              slug: "evil-b",
              title: "B",
              publishedAt: "",
              canonicalUrl: `${ORIGIN.replace("https", "http")}/posts/evil-b`,
            },
            {
              slug: "evil-c",
              title: "C",
              publishedAt: "",
              canonicalUrl: "javascript:alert(1)",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const posts = await fetchRecentDearCreativePosts(ORIGIN, 5, fetchFn as typeof fetch);
    expect(posts[0]?.canonicalUrl).toBe(buildDearCreativePostUrl(ORIGIN, "evil-a"));
    expect(posts[1]?.canonicalUrl).toBe(buildDearCreativePostUrl(ORIGIN, "evil-b"));
    expect(posts[2]?.canonicalUrl).toBe(buildDearCreativePostUrl(ORIGIN, "evil-c"));
  });
});

describe("resolveDearCreativeCanonicalUrl", () => {
  it("accepts only https on the configured origin", () => {
    const trusted = `${ORIGIN}/posts/safe`;
    expect(isTrustedDearCreativeCanonicalUrl(trusted, ORIGIN)).toBe(true);
    expect(resolveDearCreativeCanonicalUrl(trusted, ORIGIN, "safe")).toBe(trusted);
    expect(resolveDearCreativeCanonicalUrl("https://other.test/x", ORIGIN, "safe")).toBe(
      buildDearCreativePostUrl(ORIGIN, "safe"),
    );
    expect(resolveDearCreativeCanonicalUrl("http://news.creativeplatform.xyz/posts/x", ORIGIN, "safe")).toBe(
      buildDearCreativePostUrl(ORIGIN, "safe"),
    );
    expect(resolveDearCreativeCanonicalUrl("javascript:alert(1)", ORIGIN, "safe")).toBe(
      buildDearCreativePostUrl(ORIGIN, "safe"),
    );
  });
});

describe("parseDearCreativeRss", () => {
  it("keeps valid RSS items when another item has an invalid pubDate", () => {
    const xml = `<rss><channel>
<item>
<title>Bad Date Post</title>
<link>${ORIGIN}/posts/bad-date</link>
<pubDate>not-a-real-date</pubDate>
</item>
<item>
<title>Good Date Post</title>
<link>${ORIGIN}/posts/good-date</link>
<pubDate>Wed, 01 Jan 2026 00:00:00 GMT</pubDate>
</item>
</channel></rss>`;
    const posts = parseDearCreativeRss(xml, ORIGIN);
    expect(posts).toHaveLength(2);
    expect(posts[0]?.slug).toBe("bad-date");
    expect(posts[0]?.publishedAt).toBe("");
    expect(posts[1]?.slug).toBe("good-date");
    expect(posts[1]?.publishedAt).toBe("2026-01-01T00:00:00.000Z");
  });

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
