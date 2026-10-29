/**
 * Logs trade failures for operators. Uses console.error; forwards to Sentry when
 * the SDK is present on window (no hard dependency on @sentry/nextjs).
 */
export function reportUnexpectedTradeError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  console.error('[MeToken trade]', context ?? {}, error);

  if (typeof window === 'undefined') return;
  const sentry = (
    window as Window & {
      Sentry?: { captureException: (e: unknown, ctx?: unknown) => void };
    }
  ).Sentry;
  sentry?.captureException(error, context ? { extra: context } : undefined);
}
