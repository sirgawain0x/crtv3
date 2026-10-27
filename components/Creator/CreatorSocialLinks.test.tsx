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

  it("renders only set platforms with safe external link attributes", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreatorSocialLinks, {
        socialOrbUrl: "https://orb.club/p/creator",
        socialXUrl: "https://x.com/creator",
      }),
    );
    expect(html).toContain('data-testid="creator-social-links"');
    expect(html).toContain('href="https://orb.club/p/creator"');
    expect(html).toContain('href="https://x.com/creator"');
    expect(html).not.toContain("instagram.com");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
});
