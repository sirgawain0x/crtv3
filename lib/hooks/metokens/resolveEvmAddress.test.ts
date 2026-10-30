import { describe, expect, it } from 'vitest';
import { resolveEvmAddress } from './resolveEvmAddress';

describe('resolveEvmAddress', () => {
  it('returns checksummed address for valid input', () => {
    const raw = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
    expect(resolveEvmAddress(raw)).toBe(
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    );
  });

  it('returns null for invalid or empty input', () => {
    expect(resolveEvmAddress('not-an-address')).toBeNull();
    expect(resolveEvmAddress('')).toBeNull();
    expect(resolveEvmAddress(undefined)).toBeNull();
    expect(resolveEvmAddress('0x123')).toBeNull();
  });
});
