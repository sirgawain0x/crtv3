/**
 * Convert human-readable amounts to base units for collateral with arbitrary decimals.
 * Used by stock-hub fork tests and future 8-decimal stock backing UI.
 */
export function parseHumanAmountToBaseUnits(
  amount: string,
  decimals: number,
): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Invalid amount");
  }
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) {
    throw new Error("Too many decimal places");
  }
  const padded = frac.padEnd(decimals, "0");
  return BigInt(whole + padded);
}

export function formatBaseUnitsToHuman(
  baseUnits: bigint,
  decimals: number,
): string {
  const s = baseUnits.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole;
}
