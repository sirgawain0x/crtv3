import { describe, expect, it } from "vitest";
import {
  parseFairVideoReference,
  parseFairVideoReferences,
} from "@/lib/chones/fair-videos";

describe("parseFairVideoReference", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const origin = "https://tv.creativeplatform.xyz";

  it("accepts discover page URLs", () => {
    expect(
      parseFairVideoReference(`${origin}/discover/${uuid}`, { origin }),
    ).toMatchObject({
      kind: "discover",
      assetId: uuid,
    });
  });

  it("accepts watch page URLs", () => {
    expect(parseFairVideoReference(`${origin}/watch/abc123`, { origin })).toMatchObject({
      kind: "watch",
      playbackId: "abc123",
    });
  });

  it("rejects unrelated URLs", () => {
    expect(parseFairVideoReference("https://example.com/v/1", { origin }).kind).toBe(
      "invalid",
    );
  });
});

describe("parseFairVideoReferences", () => {
  it("returns per-index results for mixed lists", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const origin = "https://tv.creativeplatform.xyz";
    const results = parseFairVideoReferences(
      [`${origin}/discover/${uuid}`, "not-a-url"],
      { origin },
    );

    expect(results[0]?.ok).toBe(true);
    expect(results[1]).toEqual({
      ok: false,
      index: 1,
      raw: "not-a-url",
      reason: "Unrecognized Creative TV URL or identifier",
    });
  });
});
