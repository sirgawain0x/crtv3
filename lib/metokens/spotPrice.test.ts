import { describe, expect, it } from 'vitest';
import { parseEther, parseUnits } from 'viem';
import { DAI_HUB_ID, USDC_HUB_ID } from '@/lib/contracts/MeTokenHubs';
import { computeMeTokenSpotPriceUsd, formatUsdTokenPrice } from './spotPrice';

describe('computeMeTokenSpotPriceUsd', () => {
  it('matches Trading Market math for USDC-backed vaults (6-decimal collateral)', () => {
    // $1 TVL, ~1.414 MeTokens minted → ~$0.7071 per token (HOLY1-style)
    const tvlCollateral = parseUnits('1', 6);
    const totalSupply = parseEther('1.414213562373095');

    const { tvl, price } = computeMeTokenSpotPriceUsd(
      tvlCollateral,
      0n,
      USDC_HUB_ID,
      totalSupply
    );

    expect(tvl).toBeCloseTo(1, 6);
    expect(price).toBeCloseTo(0.7071, 3);
  });

  it('uses 18-decimal collateral for DAI-backed hubs', () => {
    const tvlCollateral = parseEther('2');
    const totalSupply = parseEther('4');

    const { tvl, price } = computeMeTokenSpotPriceUsd(
      tvlCollateral,
      0n,
      DAI_HUB_ID,
      totalSupply
    );

    expect(tvl).toBeCloseTo(2, 6);
    expect(price).toBeCloseTo(0.5, 6);
  });
});

describe('formatUsdTokenPrice', () => {
  it('formats small positive prices with four decimals', () => {
    expect(formatUsdTokenPrice(0.7071)).toBe('$0.7071');
  });
});
