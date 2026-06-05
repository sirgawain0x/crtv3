import { describe, expect, it } from 'vitest';
import {
  extractLensContractAddress,
  getLensContractAddressError,
  normalizeLensPrimitiveId,
} from './primitive-id';

describe('Lens primitive IDs', () => {
  it('extracts lowercase contract addresses from Lens-style IDs', () => {
    expect(
      extractLensContractAddress(
        'lens:0xAbC0000000000000000000000000000000000001',
      ),
    ).toBe('0xabc0000000000000000000000000000000000001');
    expect(
      normalizeLensPrimitiveId(
        'https://developer.lens.xyz/contracts/0xDeF0000000000000000000000000000000000002',
      ),
    ).toBe('0xdef0000000000000000000000000000000000002');
  });

  it('returns null for labels without a contract address', () => {
    expect(normalizeLensPrimitiveId('Lens Public Feed')).toBeNull();
    expect(normalizeLensPrimitiveId('creative-feed')).toBeNull();
    expect(getLensContractAddressError('creative-feed', 'Feed contract ID')).toContain(
      '0x contract address',
    );
    expect(
      extractLensContractAddress(
        'lens:0xAbC00000000000000000000000000000000000012345',
      ),
    ).toBeNull();
  });
});
