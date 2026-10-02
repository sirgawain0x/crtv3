import { describe, expect, it } from 'vitest';
import {
  extractOrbQrFailureFromBody,
  extractOrbQrFailureMessage,
  parseOrbQrInitResponse,
} from './qr-init-response';

describe('extractOrbQrFailureMessage', () => {
  it('reads FAILED msg from upstream outage responses', () => {
    expect(
      extractOrbQrFailureMessage({
        status: 'FAILED',
        msg: 'Sign in with Orb is temporarily unavailable. Please try again later.',
      }),
    ).toMatch(/temporarily unavailable/i);
  });

  it('reads Missing origin failures', () => {
    expect(
      extractOrbQrFailureMessage({
        status: 'FAILED',
        msg: 'Missing origin header',
      }),
    ).toMatch(/missing origin/i);
  });

  it('returns undefined for a successful-looking payload', () => {
    expect(
      extractOrbQrFailureMessage({
        qrCode: 'data:image/png;base64,abc',
        secret: 'sec',
        deepLink: 'orb://sign-in',
      }),
    ).toBeUndefined();
  });
});

describe('extractOrbQrFailureFromBody', () => {
  it('parses JSON text bodies', () => {
    expect(
      extractOrbQrFailureFromBody(
        '{"status":"FAILED","msg":"Missing origin header"}',
      ),
    ).toBe('Missing origin header');
  });

  it('returns undefined for non-JSON', () => {
    expect(extractOrbQrFailureFromBody('<html>nope</html>')).toBeUndefined();
  });
});

describe('parseOrbQrInitResponse', () => {
  it('throws the upstream FAILED message', () => {
    expect(() =>
      parseOrbQrInitResponse({
        status: 'FAILED',
        msg: 'Sign in with Orb is temporarily unavailable. Please try again later.',
      }),
    ).toThrow(/temporarily unavailable/i);
  });

  it('returns qr fields for a valid payload', () => {
    const parsed = parseOrbQrInitResponse({
      qrCode: 'data:image/png;base64,abc',
      secret: 'sec-123',
      deepLink: 'orb://sign-in?x=1',
    });
    expect(parsed.qrCode).toBe('data:image/png;base64,abc');
    expect(parsed.secret).toBe('sec-123');
    expect(parsed.deepLink).toBe('orb://sign-in?x=1');
  });
});
