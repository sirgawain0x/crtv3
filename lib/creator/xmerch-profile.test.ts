import { describe, expect, it } from "vitest";
import {
  MAX_XMERCH_FEATURED_PRODUCTS,
  sanitizeStoredXmerchProfile,
  validateAndNormalizeXmerchProfileInput,
} from "@/lib/creator/xmerch-profile";

describe("validateAndNormalizeXmerchProfileInput", () => {
  it("normalizes store and featured product URLs", () => {
    const result = validateAndNormalizeXmerchProfileInput({
      storeUrl: "creative.xmerch.app",
      featuredProductUrls: [
        "https://creative.xmerch.app/products/tee/",
        "https://creative.xmerch.app/products/hoodie",
      ],
    });
    expect(result).toEqual({
      ok: true,
      value: {
        storeUrl: "https://creative.xmerch.app",
        featuredProductUrls: [
          "https://creative.xmerch.app/products/tee",
          "https://creative.xmerch.app/products/hoodie",
        ],
      },
    });
  });

  it("rejects more than the featured limit", () => {
    const urls = Array.from(
      { length: MAX_XMERCH_FEATURED_PRODUCTS + 1 },
      (_, i) => `https://creative.xmerch.app/p/${i}`,
    );
    const result = validateAndNormalizeXmerchProfileInput({
      featuredProductUrls: urls,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.social_xmerch_featured).toMatch(/at most 6/);
    }
  });

  it("rejects homepage-only featured URLs and http links", () => {
    const result = validateAndNormalizeXmerchProfileInput({
      featuredProductUrls: [
        "https://creative.xmerch.app",
        "http://creative.xmerch.app/products/a",
      ],
    });
    expect(result.ok).toBe(false);
  });
});

describe("sanitizeStoredXmerchProfile", () => {
  it("parses JSON objects and drops invalid featured rows", () => {
    expect(
      sanitizeStoredXmerchProfile({
        storeUrl: "https://creative.xmerch.app",
        featuredProductUrls: [
          "https://creative.xmerch.app/products/valid",
          "https://evil.com/x",
        ],
      }),
    ).toEqual({
      storeUrl: "https://creative.xmerch.app",
      featuredProductUrls: ["https://creative.xmerch.app/products/valid"],
    });
  });

  it("supports legacy plain store URL strings", () => {
    expect(sanitizeStoredXmerchProfile("https://creative.xmerch.app")).toEqual({
      storeUrl: "https://creative.xmerch.app",
      featuredProductUrls: [],
    });
  });
});
