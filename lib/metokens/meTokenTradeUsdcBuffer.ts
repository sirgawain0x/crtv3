/** Buy-path USDC collateral + gas buffer rules (shared with tests). */

export function shouldReserveUsdcGasBufferForBuy(params: {
  collateralSymbol: string;
  isSponsored: boolean;
  usdcAnyTokenPolicyConfigured: boolean;
}): boolean {
  return (
    params.collateralSymbol === 'USDC' &&
    (!params.isSponsored ||
      (params.isSponsored && params.usdcAnyTokenPolicyConfigured))
  );
}

export type UsdcBuyBalanceShortfall = 'low_usdc_gas' | 'insufficient_collateral';

export function classifyUsdcBuyBalanceShortfall(params: {
  collateralBalance: bigint;
  requiredBalance: bigint;
  collateralSymbol: string;
  reserveUsdcGasBuffer: boolean;
  minGasBuffer: bigint;
}): UsdcBuyBalanceShortfall | null {
  if (params.collateralBalance >= params.requiredBalance) return null;
  if (
    params.collateralSymbol === 'USDC' &&
    (params.reserveUsdcGasBuffer ||
      params.collateralBalance < params.minGasBuffer)
  ) {
    return 'low_usdc_gas';
  }
  return 'insufficient_collateral';
}
