import { describe, expect, it } from 'vitest';
import {
  classifyGasError,
  isSponsorFallbackEligible,
  PROVISIONAL_GAS_ERROR_MATCHERS,
} from './classifyGasError';

describe('classifyGasError', () => {
  it('lists provisional matchers with doc sources', () => {
    expect(PROVISIONAL_GAS_ERROR_MATCHERS.length).toBeGreaterThan(0);
    for (const row of PROVISIONAL_GAS_ERROR_MATCHERS) {
      expect(row.id).toMatch(/^[a-z0-9_]+$/);
      expect(row.source).toMatch(/^https:\/\/www\.alchemy\.com\//);
    }
  });

  it('treats bare Gas Manager policy strings as pre-submit fallback eligible', () => {
    const err = new Error('Policy rejected');
    expect(classifyGasError(err).kind).toBe('sponsor_policy_rejection');
    expect(classifyGasError(err).phase).toBe('pre_submit');
    expect(isSponsorFallbackEligible(err)).toBe(true);
  });

  it('classifies policy not found as sponsor rejection', () => {
    const err = new Error(
      'Sponsorship failed: [invalid_argument] Policy ID(s) not found.',
    );
    expect(classifyGasError(err).kind).toBe('sponsor_policy_rejection');
    expect(isSponsorFallbackEligible(err)).toBe(true);
  });

  it('classifies ERC20 gas balance errors as insufficient USDC', () => {
    const err = new Error('ERC20: transfer amount exceeds balance');
    expect(classifyGasError(err).kind).toBe('insufficient_usdc_for_gas');
    expect(isSponsorFallbackEligible(err)).toBe(false);
  });

  it('does not allow sponsor fallback for unclassified errors', () => {
    const err = new Error('unexpected upstream failure');
    expect(classifyGasError(err).kind).toBe('other');
    expect(isSponsorFallbackEligible(err)).toBe(false);
  });

  it('does not allow sponsor fallback when phase is not pre_submit', () => {
    const err = new Error('user operation reverted during sponsorship');
    expect(isSponsorFallbackEligible(err)).toBe(false);
  });

  it('does not allow sponsor fallback after a user op hash exists', () => {
    const err = new Error('Sponsorship failed: max number of userOps');
    expect(
      isSponsorFallbackEligible(err, { userOpHash: '0xabc' }),
    ).toBe(false);
  });
});
