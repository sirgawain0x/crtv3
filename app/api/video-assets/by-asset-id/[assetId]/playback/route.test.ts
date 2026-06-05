import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetVideoAssetByAssetId = vi.fn();

vi.mock("@/services/video-assets", () => ({
  getVideoAssetByAssetId: (...args: unknown[]) => mockGetVideoAssetByAssetId(...args),
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/middleware/platformApiAccess", () => ({
  requirePlatformApiAccess: vi.fn(async () => ({ allowed: true, tier: "public" })),
  platformApiOptionsResponse: vi.fn(() => new Response(null, { status: 200 })),
}));

import { GET, OPTIONS } from "./route";

describe("GET /api/video-assets/by-asset-id/[assetId]/playback", () => {
  const assetId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.stubEnv("PLATFORM_API_ACCESS_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tv.creativeplatform.xyz");
    mockGetVideoAssetByAssetId.mockResolvedValue({
      asset_id: assetId,
      playback_id: "playback-123",
      title: "Test Video",
      thumbnailUri: "https://example.com/thumb.jpg",
      requires_metoken: false,
      status: "published",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns slim playback payload with CORS headers", async () => {
    const response = await GET(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ assetId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    await expect(response.json()).resolves.toEqual({
      playbackId: "playback-123",
      title: "Test Video",
      thumbnailUri: "https://example.com/thumb.jpg",
      requiresMetoken: false,
      fallbackUrl: `https://tv.creativeplatform.xyz/discover/${assetId}`,
    });
  });

  it("returns 404 for unpublished assets", async () => {
    mockGetVideoAssetByAssetId.mockResolvedValue({
      asset_id: assetId,
      playback_id: "playback-123",
      status: "draft",
    });

    const response = await GET(new NextRequest("http://localhost/api"), {
      params: Promise.resolve({ assetId }),
    });

    expect(response.status).toBe(404);
  });

  it("handles OPTIONS preflight", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(200);
  });
});
