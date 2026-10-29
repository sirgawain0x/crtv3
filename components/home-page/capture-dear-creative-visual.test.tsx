// @vitest-environment jsdom
/**
 * Real-component visual capture (mocked server actions only).
 * Run: CAPTURE_DEAR_CREATIVE_VISUAL=1 yarn vitest run components/home-page/capture-dear-creative-visual.test.tsx
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import DearCreativePublications from "./DearCreativePublications";
import MusicNewsPage from "@/app/news/music/page";
import type { DearCreativePost } from "@/lib/dear-creative/types";

const ORIGIN = "https://news.creativeplatform.xyz";
const OUT_DIR = "/opt/cursor/artifacts/screenshots/dear-creative-pr384-v2";

const MOCK_POSTS: DearCreativePost[] = [
  {
    slug: "onchain-music-roundup",
    title: "Onchain Music Roundup",
    publishedAt: "2026-02-15T12:00:00.000Z",
    excerpt: "Weekly music and culture from Dear Creative.",
    coverImage: "https://picsum.photos/seed/dc-music/800/450",
    isGated: false,
    tags: ["music"],
    canonicalUrl: `${ORIGIN}/posts/onchain-music-roundup`,
  },
  {
    slug: "creator-economy-brief",
    title: "Creator Economy Brief",
    publishedAt: "2026-02-10T09:30:00.000Z",
    excerpt: "Public post for the home feed.",
    coverImage: "https://picsum.photos/seed/dc-brief/800/450",
    isGated: false,
    canonicalUrl: `${ORIGIN}/posts/creator-economy-brief`,
  },
  {
    slug: "members-only-dispatch",
    title: "Members Only Dispatch",
    publishedAt: "2026-02-01T18:00:00.000Z",
    excerpt: "Subscriber-only insights.",
    coverImage: "https://picsum.photos/seed/dc-gated/800/450",
    isGated: true,
    tags: ["music"],
    canonicalUrl: `${ORIGIN}/posts/members-only-dispatch`,
  },
];

vi.mock("@/app/actions/dear-creative", () => ({
  getDearCreativeRecentPosts: vi.fn(),
  getDearCreativeActiveSubscriberCount: vi.fn(),
  getDearCreativeOriginForClient: vi.fn(),
  getDearCreativeMusicPosts: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import {
  getDearCreativeRecentPosts,
  getDearCreativeActiveSubscriberCount,
  getDearCreativeOriginForClient,
  getDearCreativeMusicPosts,
} from "@/app/actions/dear-creative";
import { filterMusicDearCreativePosts } from "@/lib/dear-creative/feed";

const captureEnabled = process.env.CAPTURE_DEAR_CREATIVE_VISUAL === "1";

function buildHtmlDocument(markup: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class', theme: { extend: {} } };
  </script>
  <style>
    body { background: hsl(0 0% 3.9%); color: hsl(0 0% 98%); font-family: system-ui, sans-serif; }
    .text-primary { color: hsl(346 77% 60%); }
    .text-muted-foreground { color: hsl(0 0% 63.9%); }
    .text-card-foreground { color: hsl(0 0% 98%); }
    .bg-card { background: hsl(0 0% 3.9%); }
    .border-border\\/50 { border-color: hsl(0 0% 14.9% / 0.5); }
    .bg-muted { background: hsl(0 0% 14.9%); }
    .bg-secondary { background: hsl(0 0% 14.9%); }
    .bg-primary\\/90 { background: hsl(346 77% 60% / 0.9); }
    .text-primary-foreground { color: hsl(0 0% 98%); }
  </style>
</head>
<body>${markup}</body>
</html>`;
}

async function renderToMarkup(element: React.ReactElement): Promise<string> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  const html = container.innerHTML;
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return html;
}

async function screenshotMarkup(
  browser: import("playwright").Browser,
  markup: string,
  fileName: string,
  width: number,
  height: number,
) {
  await mkdir(OUT_DIR, { recursive: true });
  const htmlPath = path.join(OUT_DIR, `${fileName}.html`);
  await writeFile(htmlPath, buildHtmlDocument(markup), "utf8");
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const pngPath = path.join(OUT_DIR, fileName);
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return pngPath;
}

describe.runIf(captureEnabled)("Dear Creative visual capture (real components)", () => {
  beforeEach(() => {
    vi.mocked(getDearCreativeOriginForClient).mockResolvedValue(ORIGIN);
    vi.mocked(getDearCreativeActiveSubscriberCount).mockResolvedValue(1284);
    vi.mocked(getDearCreativeRecentPosts).mockResolvedValue(MOCK_POSTS.slice(0, 3));
    vi.mocked(getDearCreativeMusicPosts).mockResolvedValue(
      filterMusicDearCreativePosts(MOCK_POSTS),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("writes homepage, music, and hidden-fail screenshots at 375px and 1440px", async () => {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });

    const homeMarkup = await renderToMarkup(<DearCreativePublications />);
    expect(homeMarkup).toContain("LATEST ARTICLES");
    expect(homeMarkup).toContain("Onchain Music Roundup");
    expect(homeMarkup).toContain("Subscriber content");
    expect(homeMarkup).toContain(`${ORIGIN}/posts/onchain-music-roundup`);
    expect(homeMarkup).toContain("Join 1,284 creatives reading Dear Creative");

    const musicMarkup = await renderToMarkup(<MusicNewsPage />);
    expect(musicMarkup).toContain("Music News");
    expect(musicMarkup).toContain("Onchain Music Roundup");
    expect(musicMarkup).toContain("Members Only Dispatch");
    expect(musicMarkup).not.toContain("Creator Economy Brief");

    vi.mocked(getDearCreativeRecentPosts).mockResolvedValue([]);
    const hiddenMarkup = await renderToMarkup(
      <div data-testid="home-with-feed">
        <section className="p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">Top Videos (fixture shell)</h2>
        </section>
        <DearCreativePublications />
      </div>,
    );
    expect(hiddenMarkup).not.toContain("LATEST ARTICLES");

    const shots: Array<{ markup: string; name: string }> = [
      { markup: homeMarkup, name: "homepage-dear-creative" },
      { markup: musicMarkup, name: "music-news" },
      { markup: hiddenMarkup, name: "homepage-feed-hidden" },
    ];

    const paths: string[] = [];
    for (const shot of shots) {
      for (const { suffix, width, height } of [
        { suffix: "375px", width: 375, height: 812 },
        { suffix: "1440px", width: 1440, height: 900 },
      ]) {
        paths.push(
          await screenshotMarkup(
            browser,
            shot.markup,
            `${shot.name}-${suffix}.png`,
            width,
            height,
          ),
        );
      }
    }

    await browser.close();
    console.log("Saved screenshots:\n" + paths.join("\n"));
    expect(paths).toHaveLength(6);
  }, 120_000);
});
