import { describe, expect, it, vi } from "vitest";
import { buildInventoryReport } from "./inventory";
import { loadVideoAssetsForInventory } from "./inventory-db-load";

describe("loadVideoAssetsForInventory", () => {
  it("returns skipped status with --skip-db semantics", async () => {
    const fetchDbRows = vi.fn();
    const result = await loadVideoAssetsForInventory({ skipDb: true, fetchDbRows });
    expect(result.dbCrossReference).toBe("skipped");
    expect(result.rows).toEqual([]);
    expect(fetchDbRows).not.toHaveBeenCalled();
  });

  it("propagates DB read failures when skipDb is false", async () => {
    await expect(
      loadVideoAssetsForInventory({
        skipDb: false,
        fetchDbRows: async () => {
          throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
        },
      }),
    ).rejects.toThrow(/SUPABASE/);
  });

  it("records dbCrossReference skipped in the inventory report", async () => {
    const report = buildInventoryReport({
      studioAssets: [],
      dbRows: [],
      dbCrossReference: "skipped",
      studioApiBaseUrl: "https://livepeer.studio",
    });
    expect(report.dbCrossReference).toBe("skipped");
  });

  it("records dbCrossReference ok in the inventory report", async () => {
    const report = buildInventoryReport({
      studioAssets: [],
      dbRows: [{ id: 1, asset_id: "x", playback_id: "p", title: "t", status: "published", creator_id: "c" }],
      dbCrossReference: "ok",
      studioApiBaseUrl: "https://livepeer.studio",
    });
    expect(report.dbCrossReference).toBe("ok");
  });
});
