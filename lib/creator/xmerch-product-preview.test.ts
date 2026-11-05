import dns from "node:dns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decodeHtmlEntities,
  fetchXmerchProductPreview,
  isSafeXmerchFetchUrl,
} from "@/lib/creator/xmerch-product-preview";

function mockPublicDns() {
  vi.spyOn(dns.promises, "lookup").mockResolvedValue([
    { address: "104.21.12.34", family: 4 },
  ]);
}

function redirectResponse(location: string) {
  return {
    status: 302,
    ok: false,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "location" ? location : null,
    },
    text: async () => "",
  };
}

function htmlResponse(html: string) {
  return {
    status: 200,
    ok: true,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === "content-type") {
          return "text/html";
        }
        return null;
      },
    },
    text: async () => html,
  };
}

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

describe("isSafeXmerchFetchUrl", () => {
  beforeEach(() => {
    mockPublicDns();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects IP-literal hosts such as 169.254.169.254", async () => {
    await expect(
      isSafeXmerchFetchUrl("https://169.254.169.254/latest"),
    ).resolves.toBe(false);
  });
});

describe("fetchXmerchProductPreview", () => {
  beforeEach(() => {
    mockPublicDns();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns og title and image when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        htmlResponse(
          `<html><head><meta property="og:title" content="Bandana" /><meta property="og:image" content="/img/bandana.png" /></head></html>`,
        ),
      ),
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
      vi.fn().mockResolvedValue(
        htmlResponse(
          `<html><head><meta property="og:title" content="Chones' Bandana" /></head></html>`,
        ),
      ),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/bandana",
    );
    expect(result.title).toBe("Chones' Bandana");
  });

  it("decodes entity-encoded og:title values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        htmlResponse(
          `<html><head><meta content="Rock &amp; Roll &#39;24 &quot;Tour&quot; &#x26; Co" property="og:title" /></head></html>`,
        ),
      ),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/bandana",
    );
    expect(result.title).toBe('Rock & Roll \'24 "Tour" & Co');
  });

  it("rejects redirects to non-xmerch hosts and falls back", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          redirectResponse("https://evil.example/steal"),
        ),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/bandana",
    );
    expect(result.title).toBe("bandana");
    expect(result.imageUrl).toBeNull();
  });

  it("rejects redirects to link-local metadata IP targets", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          redirectResponse("https://169.254.169.254/latest/meta-data"),
        ),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/bandana",
    );
    expect(result.title).toBe("bandana");
    expect(result.imageUrl).toBeNull();
  });

  it("follows a valid redirect within xmerch.app", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          redirectResponse("https://shop.xmerch.app/products/final-item"),
        )
        .mockResolvedValueOnce(
          htmlResponse(
            `<html><head><meta property="og:title" content="Final Item" /></head></html>`,
          ),
        ),
    );

    const result = await fetchXmerchProductPreview(
      "https://creative.xmerch.app/products/bandana",
    );
    expect(result.title).toBe("Final Item");
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
