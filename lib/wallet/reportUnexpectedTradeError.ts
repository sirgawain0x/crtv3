import {
  gasErrorLogRawBody,
  redactGasErrorLogBody,
} from '@/lib/wallet/classifyGasError';

function redactTradeErrorForReporting(error: unknown): unknown {
  const redactedMessage = redactGasErrorLogBody(gasErrorLogRawBody(error));
  if (error instanceof Error) {
    const safe = new Error(redactedMessage);
    safe.name = error.name;
    if (error.stack) {
      safe.stack = redactGasErrorLogBody(error.stack);
    }
    return safe;
  }
  return redactedMessage;
}

function redactTradeErrorContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return context;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') {
      safe[key] = redactGasErrorLogBody(value);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Logs trade failures for operators. Uses console.error; forwards to Sentry when
 * the SDK is present on window (no hard dependency on @sentry/nextjs).
 */
export function reportUnexpectedTradeError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const safeError = redactTradeErrorForReporting(error);
  const safeContext = redactTradeErrorContext(context);

  console.error('[MeToken trade]', safeContext ?? {}, safeError);

  if (typeof window === 'undefined') return;
  const sentry = (
    window as Window & {
      Sentry?: { captureException: (e: unknown, ctx?: unknown) => void };
    }
  ).Sentry;
  sentry?.captureException(
    safeError,
    safeContext ? { extra: safeContext } : undefined,
  );
}
