import { describe, expect, it } from "vitest";
import {
  MAX_XMERCH_FEATURED_PRODUCTS,
  getPublicXmerchProfile,
  sanitizeStoredXmerchProfile,
  validateAndNormalizeXmerchProfileInput,
} from "@/lib/creator/xmerch-profile";

describe("validateAndNormalizeXmerchProfileInput", () => {
  it("normalizes enabled store and featured product URLs", () => {
    const result = validateAndNormalizeXmerchProfileInput({
      enabled: true,
      storeUrl: "creative.xmerch.app",
      featuredProductUrls: [
        "https://creative.xmerch.app/products/tee/",
        "https://creative.xmerch.app/products/hoodie",
      ],
    });
    expect(result).toEqual({
      ok: true,
      value: {
        enabled: true,
        storeUrl: "https://creative.xmerch.app",
        featuredProductUrls: [
          "https://creative.xmerch.app/products/tee",
          "https://creative.xmerch.app/products/hoodie",
        ],
      },
    });
  });

  it("rejects enabled profile with no URLs", () => {
    const result = validateAndNormalizeXmerchProfileInput({ enabled: true });
    expect(result.ok).toBe(false);
  });

  it("rejects more than the featured limit", () => {
    const urls = Array.from(
      { length: MAX_XMERCH_FEATURED_PRODUCTS + 1 },
      (_, i) => `https://creative.xmerch.app/p/${i}`,
    );
    const result = validateAndNormalizeXmerchProfileInput({
      enabled: true,
      storeUrl: "https://creative.xmerch.app",
      featuredProductUrls: urls,
    });
    expect(result.ok).toBe(false);
  });
});

describe("getPublicXmerchProfile", () => {
  it("returns null when disabled even if URLs exist", () => {
    expect(
      getPublicXmerchProfile({
        enabled: false,
        storeUrl: "https://creative.xmerch.app",
        featuredProductUrls: [],
      }),
    ).toBeNull();
  });

  it("returns profile when enabled with store URL", () => {
    expect(
      getPublicXmerchProfile({
        enabled: true,
        storeUrl: "https://creative.xmerch.app",
        featuredProductUrls: ["https://creative.xmerch.app/products/a"],
      }),
    ).toEqual({
      enabled: true,
      storeUrl: "https://creative.xmerch.app",
      featuredProductUrls: ["https://creative.xmerch.app/products/a"],
    });
  });
});

describe("sanitizeStoredXmerchProfile", () => {
  it("drops invalid featured rows", () => {
    expect(
      sanitizeStoredXmerchProfile({
        enabled: true,
        storeUrl: "https://creative.xmerch.app",
        featuredProductUrls: [
          "https://creative.xmerch.app/products/valid",
          "https://evil.com/x",
        ],
      }),
    ).toEqual({
      enabled: true,
      storeUrl: "https://creative.xmerch.app",
      featuredProductUrls: ["https://creative.xmerch.app/products/valid"],
    });
  });
});
