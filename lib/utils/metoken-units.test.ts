import { describe, expect, it } from 'vitest';
import { parseEther } from 'viem';
import {
  dbMeTokenTransactionAmountToWei,
  dbMetokenTotalSupplyToWei,
  decimalStringToWei,
} from './metoken-units';

describe('dbMeTokenTransactionAmountToWei', () => {
  it('parses human token amounts from metoken_transactions', () => {
    expect(dbMeTokenTransactionAmountToWei(1.0858)).toBe(parseEther('1.0858'));
    expect(dbMeTokenTransactionAmountToWei('3.2')).toBe(parseEther('3.2'));
  });

  it('handles scientific notation without throwing', () => {
    expect(dbMeTokenTransactionAmountToWei(1e-7)).toBe(parseEther('0.0000001'));
    expect(dbMeTokenTransactionAmountToWei('1e-7')).toBe(parseEther('0.0000001'));
  });

  it('returns 0n for invalid values instead of throwing', () => {
    expect(dbMeTokenTransactionAmountToWei('not-a-number')).toBe(0n);
    expect(dbMeTokenTransactionAmountToWei(Number.NaN)).toBe(0n);
  });
});

describe('dbMetokenTotalSupplyToWei', () => {
  it('keeps wei integer strings from chain sync writers', () => {
    expect(dbMetokenTotalSupplyToWei('3200000000000000000')).toBe(
      3200000000000000000n
    );
    expect(dbMetokenTotalSupplyToWei('9999999999')).toBe(9999999999n);
  });

  it('parses human total_supply from sync route writers', () => {
    expect(dbMetokenTotalSupplyToWei(3.2)).toBe(parseEther('3.2'));
    expect(dbMetokenTotalSupplyToWei('3.2')).toBe(parseEther('3.2'));
  });
});

describe('decimalStringToWei', () => {
  it('treats integer-only strings as wei', () => {
    expect(decimalStringToWei('9999999999')).toBe(9999999999n);
  });
});
