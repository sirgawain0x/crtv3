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

  it("renders store trigger and featured chips when enabled", () => {
    const html = renderToStaticMarkup(
      <CreatorXmerchSection
        xmerchStored={{
          enabled: true,
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: ["https://creative.xmerch.app/products/tee"],
        }}
      />,
    );
    expect(html).toContain('data-testid="xmerch-store-trigger"');
    expect(html).toContain('data-testid="xmerch-featured-products"');
    expect(html).toContain("tee");
  });
});
