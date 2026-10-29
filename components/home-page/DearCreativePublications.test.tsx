// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import DearCreativePublications from "./DearCreativePublications";

vi.mock("@/app/actions/dear-creative", () => ({
  getDearCreativeRecentPosts: vi.fn(),
  getDearCreativeActiveSubscriberCount: vi.fn(),
  getDearCreativeOriginForClient: vi.fn(),
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
} from "@/app/actions/dear-creative";

describe("DearCreativePublications", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.mocked(getDearCreativeOriginForClient).mockResolvedValue(
      "https://news.creativeplatform.xyz",
    );
    vi.mocked(getDearCreativeActiveSubscriberCount).mockResolvedValue(null);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("renders nothing when both feed sources fail (empty posts)", async () => {
    vi.mocked(getDearCreativeRecentPosts).mockResolvedValue([]);

    await act(async () => {
      root.render(<DearCreativePublications />);
      await Promise.resolve();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.textContent?.trim()).toBe("");
  });

  it("uses /posts/ links and shows the subscriber content badge for gated posts", async () => {
    vi.mocked(getDearCreativeRecentPosts).mockResolvedValue([
      {
        slug: "gated-drop",
        title: "Gated Drop",
        publishedAt: "2026-02-01T00:00:00.000Z",
        excerpt: "Members only",
        isGated: true,
      },
    ]);

    await act(async () => {
      root.render(<DearCreativePublications />);
      await Promise.resolve();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const link = container.querySelector('a[href="https://news.creativeplatform.xyz/posts/gated-drop"]');
    expect(link).toBeTruthy();
    expect(container.textContent).toContain("Subscriber content");
  });
});
