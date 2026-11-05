import { describe, expect, it } from "vitest";
import { parseHumanAmountToBaseUnits } from "@/lib/metokens/stock-backing/decimal-amounts";

/**
 * Local fork-style simulation (no RPC): mock 8-decimal stock deposit into a hub
 * mirrors MeTokenRegistryFacet.subscribe(assetsDeposited) using base units.
 */
describe("mock stock subscribe/mint (8-decimal collateral)", () => {
  it("computes assetsDeposited for subscribe with 8 decimals", () => {
    const depositHuman = "100";
    const stockDecimals = 8;
    const assetsDeposited = parseHumanAmountToBaseUnits(
      depositHuman,
      stockDecimals,
    );
    expect(assetsDeposited).toBe(10_000_000_000n);

    const mintMeTokens = assetsDeposited / 2n;
    expect(mintMeTokens).toBe(5_000_000_000n);
  });

  it("contrasts 6-decimal USDC deposit sizing", () => {
    const usdcDeposit = parseHumanAmountToBaseUnits("100", 6);
    expect(usdcDeposit).toBe(100_000_000n);
    expect(usdcDeposit).toBeLessThan(
      parseHumanAmountToBaseUnits("100", 8),
    );
  });
});
