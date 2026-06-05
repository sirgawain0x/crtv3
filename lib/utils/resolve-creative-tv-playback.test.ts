import { describe, expect, it, vi } from "vitest";
import { parseCreativeTVUrl } from "@/lib/utils/creative-tv-url";
import { resolveCreativeTVPlayback } from "@/lib/utils/resolve-creative-tv-playback";

describe("resolveCreativeTVPlayback", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const origin = "https://tv.creativeplatform.xyz";

  it("resolves watch URLs without an API call", async () => {
    const result = await resolveCreativeTVPlayback(`${origin}/watch/abc123`, {
      siteOrigin: origin,
    });

    expect(result).toEqual({
      ok: true,
      playbackId: "abc123",
      fallbackUrl: `${origin}/watch/abc123`,
      requiresMetoken: false,
      resolution: "direct",
      parsed: parseCreativeTVUrl(`${origin}/watch/abc123`, { origin }),
    });
  });

  it("resolves discover URLs via playback API", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        playbackId: "resolved-playback",
        title: "Resolved",
        thumbnailUri: "https://example.com/thumb.jpg",
        requiresMetoken: false,
        fallbackUrl: `${origin}/discover/${uuid}`,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveCreativeTVPlayback(`${origin}/discover/${uuid}`, {
      siteOrigin: origin,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/video-assets/by-asset-id/${uuid}/playback`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.playbackId).toBe("resolved-playback");
      expect(result.resolution).toBe("api");
    }

    vi.unstubAllGlobals();
  });
});
