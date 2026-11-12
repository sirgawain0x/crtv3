import { afterEach, describe, expect, it } from "vitest";
import { parseCreatorStockPickFromRow } from "@/lib/creator-stock-picks/parse-stock-pick";
import { shouldRenderCreatorStockPick } from "@/lib/creator-stock-picks/runtime-policy";

const ENV = process.env;

describe("public stock pick rendering gate", () => {
  afterEach(() => {
    process.env = { ...ENV };
  });

  it("does not render stored picks when flag off (default)", () => {
    delete process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED;
    const row = {
      ticker: "AMC",
      token_address: "0xb200000000000000000000cd7e6b8042cb7c2bb5",
      partner_url: "https://o1.exchange/swap?chainId=8453",
      note: null,
      video_asset_id: null,
    };
    const parsed = parseCreatorStockPickFromRow(row);
    expect(parsed).not.toBeNull();
    expect(shouldRenderCreatorStockPick(parsed)).toBe(false);
  });

  it("does not render when flag on but Sepolia catalog missing", () => {
    process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    const parsed = parseCreatorStockPickFromRow({
      ticker: "AMC",
      token_address: "0xabc",
      partner_url: "https://o1.exchange/swap",
      note: null,
      video_asset_id: null,
    });
    expect(shouldRenderCreatorStockPick(parsed)).toBe(false);
  });
});
