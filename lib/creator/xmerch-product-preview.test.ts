import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodeHtmlEntities,
  fetchXmerchProductPreview,
} from "@/lib/creator/xmerch-product-preview";

describe("decodeHtmlEntities", () => {
  it("decodes named entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry &lt;3 &gt; &quot;hi&quot; &#39;"))
      .toBe('Tom & Jerry <3 > "hi" \'');
    expect(decodeHtmlEntities("it&apos;s")).toBe("it's");
  });

  it("decodes decimal and hex numeric entities", () => {
    expect(decodeHtmlEntities("&#39;")).toBe("'");
    expect(decodeHtmlEntities("&#x27;")).toBe("'");
    expect(decodeHtmlEntities("&#65;")).toBe("A");
  });
});

describe("fetchXmerchProductPreview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns og title and image when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `<html><head><meta property="og:title" content="Bandana" /><meta property="og:image" content="/img/bandana.png" /></head></html>`,
      }),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/bandana",
    );
    expect(result.title).toBe("Bandana");
    expect(result.imageUrl).toBe("https://creative.xmerch.app/img/bandana.png");
  });

  it("parses double-quoted og:title with an apostrophe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `<html><head><meta property="og:title" content="Chones' Bandana" /></head></html>`,
      }),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/bandana",
    );
    expect(result.title).toBe("Chones' Bandana");
  });

  it("decodes entity-encoded og:title values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `<html><head><meta content="Rock &amp; Roll &#39;24 &quot;Tour&quot; &#x26; Co" property="og:title" /></head></html>`,
      }),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/bandana",
    );
    expect(result.title).toBe('Rock & Roll \'24 "Tour" & Co');
  });

  it("falls back to slug label when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network")),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/keys-hoodie",
    );
    expect(result.title).toBe("keys hoodie");
    expect(result.imageUrl).toBeNull();
  });
});
