import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { isMeTokenTradingSellDisabled } from "@/lib/metokens/meTokenTradingSellGuard";

describe("isMeTokenTradingSellDisabled", () => {
  const balance = parseEther("1");

  it("is disabled when sell amount exceeds balance", () => {
    expect(
      isMeTokenTradingSellDisabled(false, "2", balance),
    ).toBe(true);
  });

  it("is enabled when sell amount is within balance", () => {
    expect(
      isMeTokenTradingSellDisabled(false, "0.5", balance),
    ).toBe(false);
  });

  it("is disabled for empty or non-positive amounts", () => {
    expect(isMeTokenTradingSellDisabled(false, "", balance)).toBe(true);
    expect(isMeTokenTradingSellDisabled(false, "0", balance)).toBe(true);
  });

  it("is disabled while loading", () => {
    expect(
      isMeTokenTradingSellDisabled(true, "0.1", balance),
    ).toBe(true);
  });
});
