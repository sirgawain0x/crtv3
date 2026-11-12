import { afterEach, describe, expect, it } from "vitest";
import {
  getCreatorStockPicksBlocker,
  isCreatorStockPicksRuntimeEnabled,
  shouldRenderCreatorStockPick,
} from "@/lib/creator-stock-picks/runtime-policy";

const ENV = process.env;

describe("Creator Stock Picks runtime policy (default off / fail-closed)", () => {
  afterEach(() => {
    process.env = { ...ENV };
  });

  it("blocks when feature flag is off (default)", () => {
    delete process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED;
    delete process.env.VERCEL_ENV;
    expect(getCreatorStockPicksBlocker()).toBe("feature_flag_off");
    expect(isCreatorStockPicksRuntimeEnabled()).toBe(false);
    expect(shouldRenderCreatorStockPick({ ticker: "AMC" })).toBe(false);
  });

  it("blocks on production deployment even if flag is on", () => {
    process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED = "true";
    process.env.VERCEL_ENV = "production";
    expect(getCreatorStockPicksBlocker()).toBe("production_deployment");
    expect(isCreatorStockPicksRuntimeEnabled()).toBe(false);
    expect(shouldRenderCreatorStockPick({ ticker: "AMC" })).toBe(false);
  });

  it("blocks when flag on preview but Sepolia catalog is empty", () => {
    process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    expect(getCreatorStockPicksBlocker()).toBe("no_verified_sepolia_catalog");
    expect(isCreatorStockPicksRuntimeEnabled()).toBe(false);
    expect(shouldRenderCreatorStockPick({ ticker: "AMC" })).toBe(false);
  });
});
