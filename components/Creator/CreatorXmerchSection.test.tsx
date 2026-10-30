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
  it("renders featured product chips when provided", () => {
    const html = renderToStaticMarkup(
      <CreatorXmerchSection
        xmerchStored={{
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: [
            "https://creative.xmerch.app/products/tee",
          ],
        }}
      />,
    );
    expect(html).toContain('data-testid="xmerch-featured-products"');
    expect(html).toContain('data-testid="xmerch-featured-product"');
    expect(html).toContain("tee");
  });
});
