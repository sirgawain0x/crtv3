import { describe, expect, it } from "vitest";
import { verifyStockPickVideoOwnership } from "@/lib/creator-stock-picks/verify-stock-pick-video";

const OWNER = "0xcccccccccccccccccccccccccccccccccccccccc";
const OTHER = "0xdddddddddddddddddddddddddddddddddddddddd";
const ASSET_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("verifyStockPickVideoOwnership", () => {
  it("accepts when Livepeer asset_id belongs to owner", async () => {
    const result = await verifyStockPickVideoOwnership(
      async () => ({
        asset_id: ASSET_ID,
        creator_id: OWNER,
        playback_id: "playback-1",
      }),
      OWNER,
      ASSET_ID,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects another creator's asset", async () => {
    const result = await verifyStockPickVideoOwnership(
      async () => ({
        asset_id: ASSET_ID,
        creator_id: OTHER,
      }),
      OWNER,
      ASSET_ID,
    );
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      field: "stock_pick_video_asset_id",
    });
  });

  it("rejects missing asset", async () => {
    const result = await verifyStockPickVideoOwnership(
      async () => null,
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
      async () => null,
      OWNER,
      "not-a-uuid",
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});
