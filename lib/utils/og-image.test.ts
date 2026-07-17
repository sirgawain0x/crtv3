import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteOrigin, getVideoOgImageUrl } from "./og-image";

describe("getSiteOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tv.creativeplatform.xyz/");
    vi.stubEnv("NEXT_PUBLIC_URL", "https://other.example");
    vi.stubEnv("VERCEL_URL", "preview.vercel.app");
    expect(getSiteOrigin()).toBe("https://tv.creativeplatform.xyz");
  });

  it("falls back to NEXT_PUBLIC_URL then NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_URL", "https://app.example.com/");
    expect(getSiteOrigin()).toBe("https://app.example.com");

    vi.stubEnv("NEXT_PUBLIC_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app2.example.com");
    expect(getSiteOrigin()).toBe("https://app2.example.com");
  });

  it("uses production origin instead of VERCEL_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "crtv3-git-preview.vercel.app");
    expect(getSiteOrigin()).toBe("https://tv.creativeplatform.xyz");
  });
});

describe("getVideoOgImageUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds absolute proxy URL for video id", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tv.creativeplatform.xyz");
    expect(getVideoOgImageUrl({ id: "abc-123" })).toBe(
      "https://tv.creativeplatform.xyz/api/og/video?id=abc-123"
    );
  });

  it("builds absolute proxy URL for playbackId", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tv.creativeplatform.xyz");
    expect(getVideoOgImageUrl({ playbackId: "pb_1" })).toBe(
      "https://tv.creativeplatform.xyz/api/og/video?playbackId=pb_1"
    );
  });
});
