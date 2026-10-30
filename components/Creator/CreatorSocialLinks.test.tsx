/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CreatorSocialLinks } from "@/components/Creator/CreatorSocialLinks";

describe("CreatorSocialLinks", () => {
  it("renders nothing when no URLs are set", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreatorSocialLinks, {
        socialOrbUrl: null,
        socialInstagramUrl: undefined,
        socialXUrl: "",
      }),
    );
    expect(html).toBe("");
  });

  it("renders external social links and xMerch trigger without href", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreatorSocialLinks, {
        socialOrbUrl: "https://orb.club/p/creator",
        socialXUrl: "https://x.com/creator",
        xmerchProfile: {
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: [],
        },
        onOpenXmerch: () => {},
      }),
    );
    expect(html).toContain('data-testid="creator-social-links"');
    expect(html).toContain('href="https://orb.club/p/creator"');
    expect(html).toContain('href="https://x.com/creator"');
    expect(html).toContain('data-testid="xmerch-store-trigger"');
    expect(html).not.toContain('href="https://creative.xmerch.app"');
    expect(html).not.toContain("instagram.com");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("does not render javascript: or off-allowlist stored URLs", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreatorSocialLinks, {
        socialXUrl: "javascript:alert(1)",
        socialInstagramUrl: "https://evil.com/instagram.com/foo",
        socialOrbUrl: "https://orb.club.evil.com/p/foo",
      }),
    );
    expect(html).toBe("");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("evil.com");
  });
});
