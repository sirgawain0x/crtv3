/** User-visible MeToken trade errors (buy/sell). */
export type MeTokenTradeErrorKind = 'low_usdc_gas' | 'generic';

export class MeTokenTradeUserFacingError extends Error {
  readonly kind: MeTokenTradeErrorKind;

  constructor(kind: MeTokenTradeErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = 'MeTokenTradeUserFacingError';
    this.kind = kind;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function isMeTokenTradeUserFacingError(
  err: unknown,
): err is MeTokenTradeUserFacingError {
  return err instanceof MeTokenTradeUserFacingError;
}

export const METOKEN_TRADE_GENERIC_MESSAGE =
  'Something went wrong, please try again.';

export const METOKEN_TRADE_LOW_USDC_MESSAGE =
  'You need a little USDC on Base to pay gas.';
