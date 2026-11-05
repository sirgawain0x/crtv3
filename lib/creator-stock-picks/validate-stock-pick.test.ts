import { afterEach, describe, expect, it } from "vitest";
import { validateCreatorStockPickPayload } from "@/lib/creator-stock-picks/validate-stock-pick";

const ENV = process.env;

describe("validateCreatorStockPickPayload", () => {
  afterEach(() => {
    process.env = { ...ENV };
  });

  it("rejects writes when runtime is disabled (empty Sepolia catalog)", () => {
    process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    expect(
      validateCreatorStockPickPayload({ stock_pick_ticker: "AMC" }),
    ).toMatchObject({ ok: false });
  });

  it("clears pick when ticker empty and runtime enabled would still validate clear", () => {
    delete process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED;
    expect(
      validateCreatorStockPickPayload({ stock_pick_ticker: "" }),
    ).toEqual({ ok: true, value: null });
  });
});
