import type {
  CompatSmartAccountClient,
  SendUserOperationArgs,
  UserOperationCall,
} from '@/lib/wallet/smart-wallet-client';
import {
  classifyGasError,
  isSponsorFallbackEligible,
} from '@/lib/wallet/classifyGasError';
import { logMeTokenGasTradeFailureFromClassification } from '@/lib/wallet/logMeTokenGasTradeFailure';
import {
  MeTokenTradeUserFacingError,
  METOKEN_TRADE_GENERIC_MESSAGE,
  METOKEN_TRADE_LOW_USDC_MESSAGE,
} from '@/lib/wallet/meTokenTradeErrors';
import { reportUnexpectedTradeError } from '@/lib/wallet/reportUnexpectedTradeError';

/** Base mainnet USDC — gas + collateral for most hubs. */
export const BASE_USDC_ADDRESS =
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

/** Cheap pre-check before attempting USDC paymaster gas (6 decimals, ~$0.10). */
export const MIN_USDC_BALANCE_FOR_GAS = 100_000n;

export type TradeGasContext = SendUserOperationArgs['context'];

export type SendMeTokenTradeUserOpParams = {
  client: CompatSmartAccountClient;
  uo: UserOperationCall | UserOperationCall[];
  ownerAddress: `0x${string}`;
  primary: { context?: TradeGasContext; isSponsored: boolean };
  usdcContext?: TradeGasContext;
  readUsdcBalance?: (owner: `0x${string}`) => Promise<bigint>;
};

function contextsEqual(
  a: TradeGasContext | undefined,
  b: TradeGasContext | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.paymasterService?.policyId === b.paymasterService?.policyId &&
    a.erc20?.tokenAddress?.toLowerCase() ===
      b.erc20?.tokenAddress?.toLowerCase()
  );
}

function errorIndicatesSubmittedUserOp(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { hash?: string; userOpHash?: string; id?: string };
  return Boolean(record.hash || record.userOpHash);
}

function toUserFacingError(error: unknown): MeTokenTradeUserFacingError {
  if (error instanceof MeTokenTradeUserFacingError) return error;

  const userOpHash = errorIndicatesSubmittedUserOp(error) ? 'submitted' : null;
  const classified = classifyGasError(error, { userOpHash });
  logMeTokenGasTradeFailureFromClassification(error, classified);

  if (classified.kind === 'insufficient_usdc_for_gas') {
    return new MeTokenTradeUserFacingError(
      'low_usdc_gas',
      METOKEN_TRADE_LOW_USDC_MESSAGE,
      error,
    );
  }

  if (classified.kind === 'sponsor_policy_rejection') {
    return new MeTokenTradeUserFacingError(
      'generic',
      METOKEN_TRADE_GENERIC_MESSAGE,
      error,
    );
  }

  reportUnexpectedTradeError(error);
  return new MeTokenTradeUserFacingError(
    'generic',
    METOKEN_TRADE_GENERIC_MESSAGE,
    error,
  );
}

/**
 * Sends one MeToken trade UserOp with member sponsored-gas first, silent USDC
 * fallback on sponsor/policy failures at prepare or sponsorship time only.
 */
export async function sendMeTokenTradeUserOp(
  params: SendMeTokenTradeUserOpParams,
): Promise<{ hash: string }> {
  const { client, uo, ownerAddress, primary, usdcContext } = params;
  const readUsdc =
    params.readUsdcBalance ??
    (async () => {
      throw new Error('readUsdcBalance is required for USDC gas paths');
    });

  const ensureUsdcForGas = async () => {
    if (!usdcContext) {
      reportUnexpectedTradeError(
        new Error('USDC any-token gas policy is not configured'),
        { missingEnv: 'NEXT_PUBLIC_ANYTOKEN_POLICY_ID' },
      );
      throw new MeTokenTradeUserFacingError(
        'generic',
        METOKEN_TRADE_GENERIC_MESSAGE,
      );
    }
    const balance = await readUsdc(ownerAddress);
    if (balance < MIN_USDC_BALANCE_FOR_GAS) {
      throw new MeTokenTradeUserFacingError(
        'low_usdc_gas',
        METOKEN_TRADE_LOW_USDC_MESSAGE,
      );
    }
  };

  const pickInitialContext = (): TradeGasContext | undefined => {
    if (primary.isSponsored && primary.context) return primary.context;
    return usdcContext;
  };

  let context = pickInitialContext();
  const usingSponsoredFirst =
    primary.isSponsored &&
    !!primary.context &&
    contextsEqual(context, primary.context);

  if (!usingSponsoredFirst) {
    await ensureUsdcForGas();
  }

  const sendOnce = async (ctx: TradeGasContext | undefined) => {
    const op = await client.sendUserOperation({ uo, context: ctx });
    return op;
  };

  try {
    const op = await sendOnce(context);
    return { hash: op.hash };
  } catch (primaryErr) {
    if (errorIndicatesSubmittedUserOp(primaryErr)) {
      throw toUserFacingError(primaryErr);
    }

    const canSilentUsdcFallback =
      usingSponsoredFirst &&
      !!usdcContext &&
      isSponsorFallbackEligible(primaryErr, { userOpHash: null });

    if (canSilentUsdcFallback) {
      try {
        await ensureUsdcForGas();
        const op = await sendOnce(usdcContext);
        return { hash: op.hash };
      } catch (fallbackErr) {
        throw toUserFacingError(fallbackErr);
      }
    }

    throw toUserFacingError(primaryErr);
  }
}
