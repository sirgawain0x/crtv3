// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import DearCreativePublications from "./DearCreativePublications";
import MusicNewsPage from "@/app/news/music/page";
import {
  DEAR_CREATIVE_VISUAL_ORIGIN,
  DEAR_CREATIVE_VISUAL_POSTS,
  renderComponentMarkup,
} from "./dear-creative-visual.harness";
import { filterMusicDearCreativePosts } from "@/lib/dear-creative/feed";

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

describe("Dear Creative visual harness (real components, mocked feed)", () => {
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

  it("renders three home cards with /posts/ links, subscriber line, and gated badge", async () => {
    const markup = await renderComponentMarkup(<DearCreativePublications />);
    expect(markup).toContain("LATEST ARTICLES");
    expect(markup).toContain("Join 1,284 creatives reading Dear Creative");
    expect(markup).toContain("Onchain Music Roundup");
    expect(markup).toContain("Creator Economy Brief");
    expect(markup).toContain("Members Only Dispatch");
    expect(markup).toContain("Subscriber content");
    expect(markup).toContain(`${DEAR_CREATIVE_VISUAL_ORIGIN}/posts/onchain-music-roundup`);
    expect(markup).toContain(`${DEAR_CREATIVE_VISUAL_ORIGIN}/posts/members-only-dispatch`);
  });

  it("renders music page with music posts only", async () => {
    const markup = await renderComponentMarkup(<MusicNewsPage />);
    expect(markup).toContain("Music News");
    expect(markup).toContain("Onchain Music Roundup");
    expect(markup).toContain("Members Only Dispatch");
    expect(markup).not.toContain("Creator Economy Brief");
  });

  it("hides the home section when the feed is empty", async () => {
    vi.mocked(getDearCreativeRecentPosts).mockResolvedValue([]);
    const markup = await renderComponentMarkup(
      <div>
        <p>Top Videos shell</p>
        <DearCreativePublications />
      </div>,
    );
    expect(markup).not.toContain("LATEST ARTICLES");
  });
});
