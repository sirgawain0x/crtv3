import {
  sendMeTokenTradeUserOp,
  type SendMeTokenTradeUserOpParams,
} from '@/lib/wallet/sendMeTokenTradeUserOp';

export const ME_TOKEN_TRADE_UOP_TIMEOUT_MS = 90_000;

export const ME_TOKEN_TRADE_UOP_TIMEOUT_MESSAGE =
  'Transaction simulation timed out.';

function isSimulationTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('timed out') || message.includes('timeout');
}

/**
 * Runs exactly one {@link sendMeTokenTradeUserOp} (sponsored attempt + optional
 * USDC fallback). A UI timeout never starts a second send — it waits on the
 * in-flight promise instead.
 */
export async function raceMeTokenTradeUserOp(
  params: SendMeTokenTradeUserOpParams,
  options?: { timeoutMs?: number },
): Promise<{ hash: string }> {
  const timeoutMs = options?.timeoutMs ?? ME_TOKEN_TRADE_UOP_TIMEOUT_MS;
  const inflight = sendMeTokenTradeUserOp(params);

  try {
    return await Promise.race([
      inflight,
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(ME_TOKEN_TRADE_UOP_TIMEOUT_MESSAGE)),
          timeoutMs,
        );
      }),
    ]);
  } catch (error) {
    if (isSimulationTimeoutError(error)) {
      return inflight;
    }
    throw error;
  }
}
