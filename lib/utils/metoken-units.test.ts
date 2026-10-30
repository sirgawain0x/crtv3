import { describe, expect, it } from 'vitest';
import { parseEther } from 'viem';
import { dbNumericToWei } from './metoken-units';

describe('dbNumericToWei', () => {
  it('parses human token amounts from metoken_transactions', () => {
    expect(dbNumericToWei(1.0858)).toBe(parseEther('1.0858'));
    expect(dbNumericToWei('3.2')).toBe(parseEther('3.2'));
  });

  it('keeps wei-scale total_supply from chain sync', () => {
    const wei = '3200000000000000000';
    expect(dbNumericToWei(wei)).toBe(3200000000000000000n);
  });

  it('treats small whole numbers as human token units', () => {
    expect(dbNumericToWei(3)).toBe(parseEther('3'));
  });
});
