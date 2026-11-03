import { logger } from '@/lib/utils/logger';
import {
  classifyGasError,
  gasErrorLogRawBody,
  redactGasErrorLogBody,
  type ClassifiedGasError,
} from '@/lib/wallet/classifyGasError';
import { reportUnexpectedTradeError } from '@/lib/wallet/reportUnexpectedTradeError';

export function logMeTokenGasTradeFailureFromClassification(
  error: unknown,
  classified: ClassifiedGasError,
): void {
  if (classified.kind === 'other') return;

  const redactedErrorBody = redactGasErrorLogBody(gasErrorLogRawBody(error));
  const payload = { ...classified, redactedErrorBody };

  if (classified.kind === 'sponsor_policy_rejection') {
    logger.debug('[MeToken gas classification]', payload);
    return;
  }

  logger.warn('[MeToken gas classification]', payload);
  reportUnexpectedTradeError(new Error('MeToken gas error classified'), payload);
}

/** Log at most once per terminal trade failure (not for silent sponsor → USDC retry). */
export function logMeTokenGasTradeFailure(
  error: unknown,
  options?: { userOpHash?: string | null },
): void {
  const classified = classifyGasError(error, options);
  logMeTokenGasTradeFailureFromClassification(error, classified);
}
