import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchXmerchProductPreview } from "@/lib/creator/xmerch-product-preview";

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
