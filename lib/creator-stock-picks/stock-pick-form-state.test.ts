import { describe, expect, it } from "vitest";
import { stockPickEditorValueFromStored } from "@/lib/creator-stock-picks/stock-pick-form-state";

describe("stockPickEditorValueFromStored (cancel reset)", () => {
  const saved = {
    ticker: "AMC",
    token_address: "0xb200000000000000000000cd7e6b8042cb7c2bb5",
    partner_url: "https://o1.exchange/swap",
    note: "saved thesis",
    video_asset_id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
  };

  it("restores profile values after simulated cancel (discard draft edits)", () => {
    const draft: typeof saved = {
      ...saved,
      note: "draft thesis must not persist",
      video_asset_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    };

    let form = stockPickEditorValueFromStored(saved);
    expect(form.note).toBe("saved thesis");

    form = {
      ...form,
      note: draft.note,
      video_asset_id: draft.video_asset_id,
    };
    expect(form.note).toBe("draft thesis must not persist");

    form = stockPickEditorValueFromStored(saved);
    expect(form).toEqual({
      ticker: "AMC",
      note: "saved thesis",
      video_asset_id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
    });
  });

  it("cancel then save would persist restored values, not draft edits", () => {
    const stored = {
      ticker: "AMC",
      token_address: "0xb200000000000000000000cd7e6b8042cb7c2bb5",
      partner_url: "https://o1.exchange/swap",
      note: "saved thesis",
      video_asset_id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
    };

    let form = stockPickEditorValueFromStored(stored);
    form = { ...form, note: "unsaved draft", ticker: "ZZZZZ" };
    form = stockPickEditorValueFromStored(stored);

    const savePayload = {
      stock_pick_ticker: form.ticker || null,
      stock_pick_note: form.note || null,
      stock_pick_video_asset_id: form.video_asset_id || null,
    };

    expect(savePayload).toEqual({
      stock_pick_ticker: "AMC",
      stock_pick_note: "saved thesis",
      stock_pick_video_asset_id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
    });
  });
});
