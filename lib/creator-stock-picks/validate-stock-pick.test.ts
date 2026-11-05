import { describe, expect, it } from "vitest";
import { validateCreatorStockPickPayload } from "@/lib/creator-stock-picks/validate-stock-pick";

describe("validateCreatorStockPickPayload", () => {
  it("clears pick when ticker empty", () => {
    expect(
      validateCreatorStockPickPayload({ stock_pick_ticker: "" }),
    ).toEqual({ ok: true, value: null });
  });

  it("accepts catalog AMC with note", () => {
    const result = validateCreatorStockPickPayload({
      stock_pick_ticker: "AMC",
      stock_pick_note: "Thesis for demo only.",
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.ticker).toBe("AMC");
      expect(result.value.partner_url).toMatch(/^https:\/\/o1\.exchange\//);
    }
  });

  it("rejects unknown ticker", () => {
    expect(
      validateCreatorStockPickPayload({ stock_pick_ticker: "ZZZZZ" }),
    ).toMatchObject({ ok: false });
  });

  it("rejects garbage ticker", () => {
    expect(
      validateCreatorStockPickPayload({ stock_pick_ticker: "AMC123" }),
    ).toMatchObject({ ok: false });
  });

  it("rejects note over max length", () => {
    expect(
      validateCreatorStockPickPayload({
        stock_pick_ticker: "BAC",
        stock_pick_note: "x".repeat(281),
      }),
    ).toMatchObject({ ok: false });
  });
});
