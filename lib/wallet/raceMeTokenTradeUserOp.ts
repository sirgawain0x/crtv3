import { logger } from '@/lib/utils/logger';
import {
  MeTokenTradeUserFacingError,
  METOKEN_TRADE_PENDING_MESSAGE,
} from '@/lib/wallet/meTokenTradeErrors';
import {
  sendMeTokenTradeUserOp,
  type SendMeTokenTradeUserOpParams,
} from '@/lib/wallet/sendMeTokenTradeUserOp';

export const ME_TOKEN_TRADE_UOP_TIMEOUT_MS = 90_000;

export const ME_TOKEN_TRADE_UOP_TIMEOUT_MESSAGE =
  'Transaction simulation timed out.';

/**
 * Runs exactly one {@link sendMeTokenTradeUserOp} (sponsored attempt + optional
 * USDC fallback). A UI timeout releases the caller with `trade_pending` and
 * never starts another send; the in-flight op may still finish in the background.
 */
export async function raceMeTokenTradeUserOp(
  params: SendMeTokenTradeUserOpParams,
  options?: { timeoutMs?: number },
): Promise<{ hash: string }> {
  const timeoutMs = options?.timeoutMs ?? ME_TOKEN_TRADE_UOP_TIMEOUT_MS;
  let timedOut = false;
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const inflight = sendMeTokenTradeUserOp(params);
  inflight
    .then((result) => {
      if (timedOut) {
        logger.warn(
          '[MeToken trade] UserOp completed after UI timeout (no resubmit)',
          { hash: result.hash },
        );
      }
    })
    .catch((err) => {
      if (timedOut) {
        logger.warn(
          '[MeToken trade] UserOp failed after UI timeout (no resubmit)',
          err,
        );
      }
    });

  return new Promise<{ hash: string }>((resolve, reject) => {
    const finish = (action: 'resolve' | 'reject', value: unknown) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (action === 'resolve') {
        resolve(value as { hash: string });
      } else {
        reject(value);
      }
    };

    timeoutId = setTimeout(() => {
      timedOut = true;
      finish(
        'reject',
        new MeTokenTradeUserFacingError(
          'trade_pending',
          METOKEN_TRADE_PENDING_MESSAGE,
          new Error(ME_TOKEN_TRADE_UOP_TIMEOUT_MESSAGE),
        ),
      );
    }, timeoutMs);

    inflight
      .then((result) => finish('resolve', result))
      .catch((err) => finish('reject', err));
  });
}
