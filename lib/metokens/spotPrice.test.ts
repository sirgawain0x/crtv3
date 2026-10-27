import { describe, expect, it } from 'vitest';
import { parseEther, parseUnits } from 'viem';
import { USDC_HUB_ID } from '@/lib/contracts/MeTokenHubs';
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

  it('does not treat USDC wei as 18-decimal ether (would show ~$0.0000)', () => {
    const oneUsdc = parseUnits('1', 6);
    const totalSupply = parseEther('1.414213562373095');

    const wrongTvl = Number(oneUsdc) / 1e18;
    const wrongPrice = wrongTvl / 1.414213562373095;

    const { price } = computeMeTokenSpotPriceUsd(
      oneUsdc,
      0n,
      USDC_HUB_ID,
      totalSupply
    );

    expect(wrongPrice).toBeLessThan(0.0001);
    expect(price).toBeGreaterThan(0.5);
  });
});

describe('formatUsdTokenPrice', () => {
  it('formats small positive prices with four decimals', () => {
    expect(formatUsdTokenPrice(0.7071)).toBe('$0.7071');
  });
});
