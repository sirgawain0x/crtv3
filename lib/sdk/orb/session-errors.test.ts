import { describe, expect, it } from 'vitest';
import { isRevokedOrbSessionError } from './session-errors';

describe('isRevokedOrbSessionError', () => {
  it('detects Lens revoked refresh copy', () => {
    expect(
      isRevokedOrbSessionError(
        new Error('You are trying to renew a revoked authentication'),
      ),
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isRevokedOrbSessionError(new Error('Network request failed'))).toBe(
      false,
    );
  });
});
