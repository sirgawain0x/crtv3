/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CreatorXmerchSection } from "@/components/Creator/CreatorXmerchSection";

vi.mock("@/components/Creator/XmerchStoreEmbedModal", () => ({
  XmerchStoreEmbedModal: () => null,
}));

describe("CreatorXmerchSection", () => {
  it("renders nothing when xMerch is disabled", () => {
    const html = renderToStaticMarkup(
      <CreatorXmerchSection
        xmerchStored={{
          enabled: false,
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: ["https://creative.xmerch.app/products/tee"],
        }}
      />,
    );
    expect(html).toBe("");
  });

  it("shows featured product cards when featured URLs exist (not store button)", () => {
    const html = renderToStaticMarkup(
      <CreatorXmerchSection
        xmerchStored={{
          enabled: true,
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: ["https://creative.xmerch.app/products/tee"],
        }}
        productPreviews={{
          "https://creative.xmerch.app/products/tee": {
            title: "Creative Tee",
            imageUrl: "https://creative.xmerch.app/tee.jpg",
          },
        }}
      />,
    );
    expect(html).not.toContain('data-testid="xmerch-store-trigger"');
    expect(html).toContain('data-testid="xmerch-featured-products"');
    expect(html).toContain("Creative Tee");
    expect(html).toContain("https://creative.xmerch.app/tee.jpg");
  });

  it("shows store button when only store URL is configured", () => {
    const html = renderToStaticMarkup(
      <CreatorXmerchSection
        xmerchStored={{
          enabled: true,
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: [],
        }}
      />,
    );
    expect(html).toContain('data-testid="xmerch-store-trigger"');
    expect(html).not.toContain('data-testid="xmerch-featured-products"');
  });

  it("uses xMerch icon markup when no preview image is provided", () => {
    const html = renderToStaticMarkup(
      <CreatorXmerchSection
        xmerchStored={{
          enabled: true,
          storeUrl: null,
          featuredProductUrls: ["https://creative.xmerch.app/products/tee"],
        }}
      />,
    );
    expect(html).toContain("/icons/xmerch-icon-32.png");
    expect(html).toContain("tee");
  });
});
