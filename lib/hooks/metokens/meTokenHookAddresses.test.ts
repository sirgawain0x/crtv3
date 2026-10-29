import { describe, expect, it } from 'vitest';
import { requireMeTokenAddress } from './meTokenHookAddresses';

describe('requireMeTokenAddress', () => {
  it('returns a checksummed address for valid input', () => {
    expect(requireMeTokenAddress('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')).toBe(
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    );
  });

  it('throws for invalid addresses', () => {
    expect(() => requireMeTokenAddress('not-valid')).toThrow(
      'Invalid MeToken address',
    );
  });
});
