/**
 * Estimate a wallet's redeemable MeToken value from vault TVL.
 *
 * MeToken hubs on Creative use USD-pegged stables (USDC/DAI/USDS/GHO), so vault
 * collateral amount ≈ USD. Holding value is ownership share of that vault:
 *   (balance / totalSupply) × vaultTvlUsd
 *
 * This is an estimate — bonding-curve exit price can differ slightly from pro-rata.
 */

export type MeTokenHoldingValueInput = {
  /** Wallet balance in wei (18 decimals for MeTokens). */
  balanceRaw: bigint;
  /** ERC-20 totalSupply in wei. */
  totalSupply: bigint;
  /** Vault collateral TVL already converted to USD units (stablecoin amount). */
  vaultTvlUsd: number;
};

/**
 * Pro-rata estimated USD value of a MeToken holding (including the creator's own).
 */
export function estimateMeTokenHoldingValueUsd({
  balanceRaw,
  totalSupply,
  vaultTvlUsd,
}: MeTokenHoldingValueInput): number {
  if (balanceRaw <= BigInt(0) || totalSupply <= BigInt(0) || !(vaultTvlUsd > 0)) {
    return 0;
  }

  // Scale fraction in bigint to avoid float/bigint loss for large supplies.
  const SCALE = BigInt(1_000_000);
  const fractionScaled = (balanceRaw * SCALE) / totalSupply;
  return (Number(fractionScaled) / Number(SCALE)) * vaultTvlUsd;
}

/**
 * Sum estimated holding values for a portfolio list.
 */
export function sumMeTokenHoldingValuesUsd(
  holdings: Array<{ holdingValueUsd?: number }>
): number {
  return holdings.reduce((sum, h) => sum + (h.holdingValueUsd ?? 0), 0);
}

/**
 * Format a small/large USD holding for UI chips.
 */
export function formatMeTokenHoldingUsd(value: number): string {
  if (!(value > 0)) return "$0.00";
  if (value < 0.01) return "<$0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1_000_000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${(value / 1_000_000).toFixed(1)}M`;
}
