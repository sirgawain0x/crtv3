import { describe, expect, it } from "vitest";
import {
  formatBaseUnitsToHuman,
  parseHumanAmountToBaseUnits,
} from "@/lib/metokens/stock-backing/decimal-amounts";

describe("8-decimal stock token amounts", () => {
  it("parses whole and fractional units", () => {
    expect(parseHumanAmountToBaseUnits("1", 8)).toBe(100_000_000n);
    expect(parseHumanAmountToBaseUnits("0.5", 8)).toBe(50_000_000n);
    expect(parseHumanAmountToBaseUnits("10.12345678", 8)).toBe(
      1_012_345_678n,
    );
  });

  it("round-trips format", () => {
    const base = parseHumanAmountToBaseUnits("3.25", 8);
    expect(formatBaseUnitsToHuman(base, 8)).toBe("3.25");
  });

  it("rejects excess precision", () => {
    expect(() => parseHumanAmountToBaseUnits("1.123456789", 8)).toThrow();
  });
});
