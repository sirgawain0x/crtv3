import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import {
  MIN_USDC_BALANCE_FOR_GAS,
  sendMeTokenTradeUserOp,
} from './sendMeTokenTradeUserOp';
import type { CompatSmartAccountClient } from '@/lib/wallet/smart-wallet-client';
import { isMeTokenTradeUserFacingError } from './meTokenTradeErrors';
import { logger } from '@/lib/utils/logger';
import { reportUnexpectedTradeError } from '@/lib/wallet/reportUnexpectedTradeError';

vi.mock('@/lib/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/wallet/reportUnexpectedTradeError', () => ({
  reportUnexpectedTradeError: vi.fn(),
}));

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

describe('sendMeTokenTradeUserOp', () => {
  beforeEach(() => {
    vi.mocked(logger.debug).mockClear();
    vi.mocked(logger.warn).mockClear();
    vi.mocked(reportUnexpectedTradeError).mockClear();
  });

  it('logs classified gas failures exactly once per terminal trade error', async () => {
    const sendUserOperation = vi
      .fn()
      .mockRejectedValue(new Error('ERC20: transfer amount exceeds balance'));

    await expect(
      sendMeTokenTradeUserOp({
        client: mockClient(sendUserOperation),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: undefined, isSponsored: false },
        usdcContext: USDC,
        readUsdcBalance: async () => MIN_USDC_BALANCE_FOR_GAS,
      }),
    ).rejects.toMatchObject({ kind: 'low_usdc_gas' });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
    expect(reportUnexpectedTradeError).toHaveBeenCalledTimes(1);
  });

  it('does not log gas classification when sponsor failure is silently retried with USDC', async () => {
    const sendUserOperation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Sponsorship failed: max number of userOps for this policy'),
      )
      .mockResolvedValueOnce({ hash: 'call-usdc' });

    await sendMeTokenTradeUserOp({
      client: mockClient(sendUserOperation),
      uo: UO,
      ownerAddress: OWNER,
      primary: { context: SPONSORED, isSponsored: true },
      usdcContext: USDC,
      readUsdcBalance: async () => 5_000_000n,
    });

    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(reportUnexpectedTradeError).not.toHaveBeenCalled();
  });

  it('uses debug-only logging for terminal sponsor-policy failures', async () => {
    const sendUserOperation = vi
      .fn()
      .mockRejectedValue(new Error('Policy rejected'));

    await expect(
      sendMeTokenTradeUserOp({
        client: mockClient(sendUserOperation),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: undefined, isSponsored: false },
        usdcContext: USDC,
        readUsdcBalance: async () => MIN_USDC_BALANCE_FOR_GAS,
      }),
    ).rejects.toMatchObject({ kind: 'generic' });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(reportUnexpectedTradeError).not.toHaveBeenCalled();
  });

  it('succeeds on sponsored gas for members', async () => {
    const sendUserOperation = vi.fn().mockResolvedValue({ hash: 'call-1' });
    const result = await sendMeTokenTradeUserOp({
      client: mockClient(sendUserOperation),
      uo: UO,
      ownerAddress: OWNER,
      primary: { context: SPONSORED, isSponsored: true },
      usdcContext: USDC,
      readUsdcBalance: async () => 5_000_000n,
    });

    expect(result.hash).toBe('call-1');
    expect(sendUserOperation).toHaveBeenCalledOnce();
    expect(sendUserOperation.mock.calls[0][0].context).toEqual(SPONSORED);
  });

  it('silently retries with USDC when sponsor policy rejects before submit', async () => {
    const sendUserOperation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Sponsorship failed: max number of userOps for this policy'),
      )
      .mockResolvedValueOnce({ hash: 'call-usdc' });

    const result = await sendMeTokenTradeUserOp({
      client: mockClient(sendUserOperation),
      uo: UO,
      ownerAddress: OWNER,
      primary: { context: SPONSORED, isSponsored: true },
      usdcContext: USDC,
      readUsdcBalance: async () => 5_000_000n,
    });

    expect(result.hash).toBe('call-usdc');
    expect(sendUserOperation).toHaveBeenCalledTimes(2);
    expect(sendUserOperation.mock.calls[1][0].context).toEqual(USDC);
  });

  it('does not treat a bare id field as a submitted user op', async () => {
    const sendUserOperation = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(
          new Error('Sponsorship failed: max number of userOps for this policy'),
          { id: 'rpc-request-id-only' },
        ),
      )
      .mockResolvedValueOnce({ hash: 'call-usdc' });

    const result = await sendMeTokenTradeUserOp({
      client: mockClient(sendUserOperation),
      uo: UO,
      ownerAddress: OWNER,
      primary: { context: SPONSORED, isSponsored: true },
      usdcContext: USDC,
      readUsdcBalance: async () => 5_000_000n,
    });

    expect(result.hash).toBe('call-usdc');
    expect(sendUserOperation).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the client already returned a user op hash', async () => {
    const sendUserOperation = vi.fn().mockImplementation(async () => {
      const err = new Error('wait failed') as Error & { hash?: string };
      err.hash = 'already-submitted';
      throw err;
    });

    await expect(
      sendMeTokenTradeUserOp({
        client: mockClient(sendUserOperation),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: SPONSORED, isSponsored: true },
        usdcContext: USDC,
        readUsdcBalance: async () => 5_000_000n,
      }),
    ).rejects.toSatisfy((e: unknown) => isMeTokenTradeUserFacingError(e));

    expect(sendUserOperation).toHaveBeenCalledOnce();
  });

  it('surfaces low USDC before attempting USDC gas', async () => {
    await expect(
      sendMeTokenTradeUserOp({
        client: mockClient(vi.fn()),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: undefined, isSponsored: false },
        usdcContext: USDC,
        readUsdcBalance: async () => 0n,
      }),
    ).rejects.toMatchObject({
      kind: 'low_usdc_gas',
      message: 'You need a little USDC on Base to pay gas.',
    });
  });

  it('does not USDC-fallback on unclassified sponsored errors', async () => {
    const sendUserOperation = vi
      .fn()
      .mockRejectedValue(new Error('unexpected upstream failure'));

    await expect(
      sendMeTokenTradeUserOp({
        client: mockClient(sendUserOperation),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: SPONSORED, isSponsored: true },
        usdcContext: USDC,
        readUsdcBalance: async () => 5_000_000n,
      }),
    ).rejects.toMatchObject({
      kind: 'generic',
      message: 'Something went wrong, please try again.',
    });

    expect(sendUserOperation).toHaveBeenCalledOnce();
  });

  it('shows generic (not low-USDC) when any-token policy context is missing', async () => {
    await expect(
      sendMeTokenTradeUserOp({
        client: mockClient(vi.fn()),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: undefined, isSponsored: false },
        usdcContext: undefined,
        readUsdcBalance: async () => 5_000_000n,
      }),
    ).rejects.toMatchObject({
      kind: 'generic',
      message: 'Something went wrong, please try again.',
    });
  });

  it('uses ~$0.10 USDC minimum before USDC gas', async () => {
    expect(MIN_USDC_BALANCE_FOR_GAS).toBe(100_000n);

    const sendUserOperation = vi.fn().mockResolvedValue({ hash: 'ok' });
    await sendMeTokenTradeUserOp({
      client: mockClient(sendUserOperation),
      uo: UO,
      ownerAddress: OWNER,
      primary: { context: undefined, isSponsored: false },
      usdcContext: USDC,
      readUsdcBalance: async () => MIN_USDC_BALANCE_FOR_GAS,
    });
    expect(sendUserOperation).toHaveBeenCalledOnce();

    await expect(
      sendMeTokenTradeUserOp({
        client: mockClient(vi.fn()),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: undefined, isSponsored: false },
        usdcContext: USDC,
        readUsdcBalance: async () => MIN_USDC_BALANCE_FOR_GAS - 1n,
      }),
    ).rejects.toMatchObject({ kind: 'low_usdc_gas' });
  });

  it('shows generic message for unknown prepare errors', async () => {
    const sendUserOperation = vi
      .fn()
      .mockRejectedValue(new Error('unexpected upstream failure'));

    await expect(
      sendMeTokenTradeUserOp({
        client: mockClient(sendUserOperation),
        uo: UO,
        ownerAddress: OWNER,
        primary: { context: undefined, isSponsored: false },
        usdcContext: USDC,
        readUsdcBalance: async () => 5_000_000n,
      }),
    ).rejects.toMatchObject({
      kind: 'generic',
      message: 'Something went wrong, please try again.',
    });
  });
});
