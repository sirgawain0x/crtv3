// @vitest-environment jsdom
/**
 * Manual Playwright capture only (excluded from CI vitest).
 * CAPTURE_DEAR_CREATIVE_VISUAL=1 yarn vitest run --config vitest.visual.config.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import DearCreativePublications from "./DearCreativePublications";
import MusicNewsPage from "@/app/news/music/page";
import {
  buildVisualHtmlDocument,
  DEAR_CREATIVE_VISUAL_ORIGIN,
  DEAR_CREATIVE_VISUAL_POSTS,
  renderComponentMarkup,
} from "./dear-creative-visual.harness";
import { filterMusicDearCreativePosts } from "@/lib/dear-creative/feed";

const OUT_DIR = "/opt/cursor/artifacts/screenshots/dear-creative-pr384-v2";

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

async function screenshotMarkup(
  browser: import("playwright").Browser,
  markup: string,
  fileName: string,
  width: number,
  height: number,
) {
  await mkdir(OUT_DIR, { recursive: true });
  const htmlPath = path.join(OUT_DIR, `${fileName}.html`);
  await writeFile(htmlPath, buildVisualHtmlDocument(markup), "utf8");
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const pngPath = path.join(OUT_DIR, `${fileName}.png`);
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return pngPath;
}

describe("Dear Creative Playwright capture", () => {
  beforeEach(() => {
    vi.mocked(getDearCreativeOriginForClient).mockResolvedValue(DEAR_CREATIVE_VISUAL_ORIGIN);
    vi.mocked(getDearCreativeActiveSubscriberCount).mockResolvedValue(1284);
    vi.mocked(getDearCreativeRecentPosts).mockResolvedValue(DEAR_CREATIVE_VISUAL_POSTS);
    vi.mocked(getDearCreativeMusicPosts).mockResolvedValue(
      filterMusicDearCreativePosts(DEAR_CREATIVE_VISUAL_POSTS),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("captures homepage, music, and hidden states", async () => {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });

    const homeMarkup = await renderComponentMarkup(<DearCreativePublications />);
    const musicMarkup = await renderComponentMarkup(<MusicNewsPage />);

    vi.mocked(getDearCreativeRecentPosts).mockResolvedValue([]);
    const hiddenMarkup = await renderComponentMarkup(
      <div>
        <p>Top Videos (fixture shell)</p>
        <DearCreativePublications />
      </div>,
    );

    expect(homeMarkup).toContain("Subscriber content");
    expect(musicMarkup).not.toContain("Creator Economy Brief");

    const paths: string[] = [];
    for (const [markup, name] of [
      [homeMarkup, "homepage-dear-creative"],
      [musicMarkup, "music-news"],
      [hiddenMarkup, "homepage-feed-hidden"],
    ] as const) {
      for (const { suffix, width, height } of [
        { suffix: "375px", width: 375, height: 812 },
        { suffix: "1440px", width: 1440, height: 900 },
      ]) {
        paths.push(await screenshotMarkup(browser, markup, `${name}-${suffix}`, width, height));
      }
    }

    await browser.close();
    expect(paths).toHaveLength(6);
  }, 120_000);
});
