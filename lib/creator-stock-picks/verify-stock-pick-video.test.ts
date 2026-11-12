import { describe, expect, it, vi } from "vitest";
import { verifyStockPickVideoOwnership } from "@/lib/creator-stock-picks/verify-stock-pick-video";

const OWNER = "0xcccccccccccccccccccccccccccccccccccccccc";
const OTHER = "0xdddddddddddddddddddddddddddddddddddddddd";
const ASSET_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("verifyStockPickVideoOwnership", () => {
  it("accepts when owner-scoped lookup returns the asset", async () => {
    const byAssetIdAndOwner = vi.fn(async () => ({
      asset_id: ASSET_ID,
      creator_id: OWNER,
      playback_id: "playback-1",
    }));
    const byAssetIdOnly = vi.fn(async () => null);

    const result = await verifyStockPickVideoOwnership(
      { byAssetIdAndOwner, byAssetIdOnly },
      OWNER,
      ASSET_ID,
    );
    expect(result.ok).toBe(true);
    expect(byAssetIdAndOwner).toHaveBeenCalledWith(ASSET_ID);
    expect(byAssetIdOnly).not.toHaveBeenCalled();
  });

  it("rejects another creator's asset via asset-only fallback", async () => {
    const byAssetIdAndOwner = vi.fn(async () => null);
    const byAssetIdOnly = vi.fn(async () => ({
      asset_id: ASSET_ID,
      creator_id: OTHER,
    }));

    const result = await verifyStockPickVideoOwnership(
      { byAssetIdAndOwner, byAssetIdOnly },
      OWNER,
      ASSET_ID,
    );
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      field: "stock_pick_video_asset_id",
    });
    expect(byAssetIdAndOwner).toHaveBeenCalledWith(ASSET_ID);
    expect(byAssetIdOnly).toHaveBeenCalledWith(ASSET_ID);
  });

  it("rejects missing asset", async () => {
    const result = await verifyStockPickVideoOwnership(
      {
        byAssetIdAndOwner: async () => null,
        byAssetIdOnly: async () => null,
      },
      OWNER,
      ASSET_ID,
    );
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: "Linked video was not found",
    });
  });

  it("rejects invalid uuid format", async () => {
    const result = await verifyStockPickVideoOwnership(
      {
        byAssetIdAndOwner: async () => null,
        byAssetIdOnly: async () => null,
      },
      OWNER,
      "not-a-uuid",
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});
