import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockVerifyWalletAuthArgs = vi.fn();

vi.mock('@/lib/auth/require-wallet', () => ({
  verifyWalletAuthArgs: (...args: unknown[]) => mockVerifyWalletAuthArgs(...args),
  WalletAuthError: class WalletAuthError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'WalletAuthError';
    }
  },
}));

import { WalletAuthError } from '@/lib/auth/require-wallet';
import { verifyStreamCreatorWalletAuth } from '@/lib/auth/verify-stream-creator';

describe('verifyStreamCreatorWalletAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows updates when the verified wallet matches the creator id', async () => {
    mockVerifyWalletAuthArgs.mockResolvedValue({
      address: '0xabc0000000000000000000000000000000000001',
    });

    await expect(
      verifyStreamCreatorWalletAuth(
        '0xAbC0000000000000000000000000000000000001',
        {
          address: '0xabc0000000000000000000000000000000000001',
          timestamp: 1,
          signature: '0x01',
        },
      ),
    ).resolves.toBe('0xabc0000000000000000000000000000000000001');
  });

  it('rejects updates when the verified wallet does not own the stream', async () => {
    mockVerifyWalletAuthArgs.mockResolvedValue({
      address: '0xattacker00000000000000000000000000000001',
    });

    await expect(
      verifyStreamCreatorWalletAuth(
        '0xvictim00000000000000000000000000000000001',
        {
          address: '0xattacker00000000000000000000000000000001',
          timestamp: 1,
          signature: '0x01',
        },
      ),
    ).rejects.toBeInstanceOf(WalletAuthError);
  });
});
