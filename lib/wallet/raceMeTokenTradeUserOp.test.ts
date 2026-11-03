import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import type { CompatSmartAccountClient } from '@/lib/wallet/smart-wallet-client';
import { METOKEN_TRADE_PENDING_MESSAGE } from '@/lib/wallet/meTokenTradeErrors';
import { isMeTokenTradeInFlight } from '@/lib/wallet/meTokenTradeInFlight';
import { raceMeTokenTradeUserOp } from './raceMeTokenTradeUserOp';

const TRACKED_TOKEN = '0x00000000000000000000000000000000000000aa';

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

  it('returns pending state on timeout without hanging (single send, no resubmit)', async () => {
    vi.useFakeTimers();

    const sendUserOperation = vi.fn(
      () =>
        new Promise<{ hash: string }>(() => {
          /* never settles */
        }),
    );

    const params = {
      client: mockClient(sendUserOperation),
      uo: UO,
      ownerAddress: OWNER,
      primary: { context: undefined, isSponsored: false },
      usdcContext: USDC,
      readUsdcBalance: async () => 5_000_000n,
    };

    const resultPromise = raceMeTokenTradeUserOp(params, { timeoutMs: 50 });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      kind: 'trade_pending',
      message: METOKEN_TRADE_PENDING_MESSAGE,
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(sendUserOperation).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(sendUserOperation).toHaveBeenCalledOnce();
  });

  it('clears the timeout timer when the send completes before the UI deadline', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

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
      { timeoutMs: 50 },
    );

    expect(result.hash).toBe('fast');
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('keeps the token in-flight until sendMeTokenTradeUserOp settles after trade_pending', async () => {
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

    const resultPromise = raceMeTokenTradeUserOp(params, {
      timeoutMs: 50,
      meTokenAddress: TRACKED_TOKEN,
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      kind: 'trade_pending',
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;

    expect(isMeTokenTradeInFlight(TRACKED_TOKEN)).toBe(true);

    vi.useRealTimers();
    resolveUsdc({ hash: 'done' });
    await vi.waitFor(() => {
      expect(isMeTokenTradeInFlight(TRACKED_TOKEN)).toBe(false);
    });
    expect(sendUserOperation).toHaveBeenCalledTimes(2);
  });

  it('does not start a second trade send when USDC fallback is still in flight at timeout', async () => {
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
    const assertion = expect(resultPromise).rejects.toMatchObject({
      kind: 'trade_pending',
      message: METOKEN_TRADE_PENDING_MESSAGE,
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(sendUserOperation).toHaveBeenCalledTimes(2);

    resolveUsdc({ hash: 'fallback-only' });
    await vi.advanceTimersByTimeAsync(1);
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
