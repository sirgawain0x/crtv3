import path from "node:path";
import { describe, expect, it } from "vitest";
import { relativePathForAsset } from "./paths";

describe("relativePathForAsset", () => {
  it("falls back to {assetId}.mp4 for empty, dot, dot-dot, and traversal names", () => {
    const root = path.resolve("/tmp/livepeer-archive-root");
    const assetId = "a1";
    const expected = `assets/${assetId}/${assetId}.mp4`;

    expect(relativePathForAsset(assetId, undefined, root)).toBe(expected);
    expect(relativePathForAsset(assetId, "", root)).toBe(expected);
    expect(relativePathForAsset(assetId, "   ", root)).toBe(expected);
    expect(relativePathForAsset(assetId, ".", root)).toBe(expected);
    expect(relativePathForAsset(assetId, "..", root)).toBe(expected);
    expect(relativePathForAsset(assetId, "../escape.mp4", root)).toBe(expected);
    expect(relativePathForAsset(assetId, "..\\..\\evil.mp4", root)).toBe(expected);

    expect(relativePathForAsset(assetId, "clip.mp4", root)).toBe(`assets/${assetId}/clip.mp4`);
  });
});