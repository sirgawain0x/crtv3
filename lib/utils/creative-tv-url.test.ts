import { describe, expect, it } from "vitest";
import { parseCreativeTVUrl } from "./creative-tv-url";

describe("parseCreativeTVUrl", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const origin = "https://tv.creativeplatform.xyz";

  it("parses absolute discover URLs", () => {
    expect(parseCreativeTVUrl(`${origin}/discover/${uuid}`, { origin })).toEqual({
      kind: "discover",
      assetId: uuid,
      fallbackUrl: `${origin}/discover/${uuid}`,
    });
  });

  it("parses relative discover paths", () => {
    expect(parseCreativeTVUrl(`/discover/${uuid}`, { origin })).toEqual({
      kind: "discover",
      assetId: uuid,
      fallbackUrl: `${origin}/discover/${uuid}`,
    });
  });

  it("parses bare asset UUIDs", () => {
    expect(parseCreativeTVUrl(uuid, { origin })).toEqual({
      kind: "discover",
      assetId: uuid,
      fallbackUrl: `${origin}/discover/${uuid}`,
    });
  });

  it("parses absolute watch URLs", () => {
    expect(parseCreativeTVUrl(`${origin}/watch/f1abc123xyz`, { origin })).toEqual({
      kind: "watch",
      playbackId: "f1abc123xyz",
      fallbackUrl: `${origin}/watch/f1abc123xyz`,
    });
  });

  it("parses relative watch paths", () => {
    expect(parseCreativeTVUrl("/watch/f1abc123xyz", { origin })).toEqual({
      kind: "watch",
      playbackId: "f1abc123xyz",
      fallbackUrl: `${origin}/watch/f1abc123xyz`,
    });
  });

  it("returns invalid for unrelated URLs", () => {
    expect(parseCreativeTVUrl("https://example.com/video/123", { origin })).toEqual({
      kind: "invalid",
      raw: "https://example.com/video/123",
    });
  });
});
