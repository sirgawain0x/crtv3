import { describe, expect, it } from 'vitest';
import {
  classifyUsdcBuyBalanceShortfall,
  shouldReserveUsdcGasBufferForBuy,
} from './meTokenTradeUsdcBuffer';

describe('meTokenTradeUsdcBuffer', () => {
  it('reserves USDC gas buffer for sponsored members when any-token policy exists', () => {
    expect(
      shouldReserveUsdcGasBufferForBuy({
        collateralSymbol: 'USDC',
        isSponsored: true,
        usdcAnyTokenPolicyConfigured: true,
      }),
    ).toBe(true);
  });

  it('does not reserve buffer for sponsored members without any-token policy', () => {
    expect(
      shouldReserveUsdcGasBufferForBuy({
        collateralSymbol: 'USDC',
        isSponsored: true,
        usdcAnyTokenPolicyConfigured: false,
      }),
    ).toBe(false);
  });

  it('classifies shortfall as low_usdc_gas when gas buffer is required', () => {
    expect(
      classifyUsdcBuyBalanceShortfall({
        collateralBalance: 500_000n,
        requiredBalance: 2_000_000n,
        collateralSymbol: 'USDC',
        reserveUsdcGasBuffer: true,
        minGasBuffer: 1_000_000n,
      }),
    ).toBe('low_usdc_gas');
  });

  it('classifies insufficient purchase-only USDC as collateral shortfall when buffer not reserved', () => {
    expect(
      classifyUsdcBuyBalanceShortfall({
        collateralBalance: 5_000_000n,
        requiredBalance: 10_000_000n,
        collateralSymbol: 'USDC',
        reserveUsdcGasBuffer: false,
        minGasBuffer: 1_000_000n,
      }),
    ).toBe('insufficient_collateral');
  });
});
