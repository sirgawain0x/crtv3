import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import type { CompatSmartAccountClient } from '@/lib/wallet/smart-wallet-client';
import { raceMeTokenTradeUserOp } from './raceMeTokenTradeUserOp';

const OWNER = '0x0000000000000000000000000000000000000001' as Address;
const UO = {
  target: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  data: '0x' as `0x${string}`,
  value: 0n,
};

const SPONSORED = {
  paymasterService: { policyId: 'sponsored-policy' },
};
const USDC = {
  paymasterService: { policyId: 'usdc-policy' },
  erc20: { tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
};

function mockClient(sendUserOperation: ReturnType<typeof vi.fn>) {
  return {
    sendUserOperation,
    account: { address: OWNER },
    scaAddress: OWNER,
  } as unknown as CompatSmartAccountClient;
}

describe('raceMeTokenTradeUserOp', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits on the in-flight USDC fallback after timeout (no second trade send)', async () => {
    vi.useFakeTimers();

    let resolveUsdc!: (value: { hash: string }) => void;
    const usdcFallbackPending = new Promise<{ hash: string }>((resolve) => {
      resolveUsdc = resolve;
    });

    const sendUserOperation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Sponsorship failed: max number of userOps for this policy'),
      )
      .mockImplementationOnce(() => usdcFallbackPending);

    const params = {
      client: mockClient(sendUserOperation),
      uo: UO,
      ownerAddress: OWNER,
      primary: { context: SPONSORED, isSponsored: true },
      usdcContext: USDC,
      readUsdcBalance: async () => 5_000_000n,
    };

    const resultPromise = raceMeTokenTradeUserOp(params, { timeoutMs: 50 });

    await vi.advanceTimersByTimeAsync(50);
    resolveUsdc({ hash: 'fallback-only' });

    await expect(resultPromise).resolves.toEqual({ hash: 'fallback-only' });
    expect(sendUserOperation).toHaveBeenCalledTimes(2);
  });

  it('surfaces timeout only when the in-flight send ultimately fails', async () => {
    vi.useFakeTimers();

    let rejectUsdc!: (error: Error) => void;
    const usdcFallbackPending = new Promise<{ hash: string }>((_, reject) => {
      rejectUsdc = reject;
    });

    const sendUserOperation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Sponsorship failed: max number of userOps for this policy'),
      )
      .mockImplementationOnce(() => usdcFallbackPending);

    const params = {
      client: mockClient(sendUserOperation),
      uo: UO,
      ownerAddress: OWNER,
      primary: { context: SPONSORED, isSponsored: true },
      usdcContext: USDC,
      readUsdcBalance: async () => 5_000_000n,
    };

    const resultPromise = raceMeTokenTradeUserOp(params, { timeoutMs: 20 });
    await vi.advanceTimersByTimeAsync(20);
    rejectUsdc(new Error('network down'));

    await expect(resultPromise).rejects.toMatchObject({
      kind: 'generic',
      message: 'Something went wrong, please try again.',
    });
    expect(sendUserOperation).toHaveBeenCalledTimes(2);
  });

  it('returns immediately when send completes before timeout', async () => {
    const sendUserOperation = vi.fn().mockResolvedValue({ hash: 'fast' });
    const result = await raceMeTokenTradeUserOp(
      {
        client: mockClient(sendUserOperation),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: undefined, isSponsored: false },
        usdcContext: USDC,
        readUsdcBalance: async () => 5_000_000n,
      },
      { timeoutMs: 60_000 },
    );

    expect(result.hash).toBe('fast');
    expect(sendUserOperation).toHaveBeenCalledOnce();
  });

});
