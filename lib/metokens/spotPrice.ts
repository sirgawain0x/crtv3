import { formatEther } from 'viem';
import { calculateMeTokenVaultTvlUsd } from '@/lib/utils/hubAssetUtils';

export function computeMeTokenSpotPriceUsd(
  balancePooled: bigint,
  balanceLocked: bigint,
  hubId: number,
  totalSupplyWei: bigint
): { tvl: number; price: number } {
  const tvl = calculateMeTokenVaultTvlUsd(balancePooled, balanceLocked, hubId);
  const supply = parseFloat(formatEther(totalSupplyWei));
  const price = supply > 0 ? tvl / supply : 0;
  return { tvl, price };
}

export function formatUsdTokenPrice(price: number): string {
  if (!(price > 0)) {
    return '$0.0000';
  }
  return `$${price.toFixed(4)}`;
}
