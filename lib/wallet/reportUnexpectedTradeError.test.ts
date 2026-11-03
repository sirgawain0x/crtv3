import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportUnexpectedTradeError } from './reportUnexpectedTradeError';

const ALCHEMY_KEY = 'super-secret-alchemy-key-12345';

describe('reportUnexpectedTradeError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redacts Alchemy /v2/ keys before console.error and Sentry', () => {
    const captureException = vi.fn();
    vi.stubGlobal('window', { Sentry: { captureException } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const err = new Error(
      `Request failed https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    );
    reportUnexpectedTradeError(err);

    expect(consoleSpy).toHaveBeenCalledOnce();
    const loggedError = consoleSpy.mock.calls[0][2];
    expect(loggedError).toBeInstanceOf(Error);
    expect((loggedError as Error).message).not.toContain(ALCHEMY_KEY);
    expect((loggedError as Error).message).toContain('/v2/[REDACTED]');

    expect(captureException).toHaveBeenCalledOnce();
    const sentryError = captureException.mock.calls[0][0] as Error;
    expect(sentryError.message).not.toContain(ALCHEMY_KEY);
    expect(sentryError.message).toContain('/v2/[REDACTED]');
  });
});
