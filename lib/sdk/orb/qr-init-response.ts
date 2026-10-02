import {
  parseQrInitResponse,
  type ParsedQrInitResponse,
} from '@orbclub/modules/auth/qr';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Pull Orb's FAILED `msg` / `error` from an init (or proxied) JSON body. */
export function extractOrbQrFailureMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  const status =
    typeof payload.status === 'string' ? payload.status.trim().toUpperCase() : '';
  const msg =
    (typeof payload.msg === 'string' && payload.msg.trim()) ||
    (typeof payload.error === 'string' && payload.error.trim()) ||
    undefined;

  if (status === 'FAILED') {
    return msg || 'Orb sign-in failed.';
  }

  // Upstream sometimes returns a message without qr fields and without FAILED.
  const hasQr =
    typeof payload.qrCode === 'string' && payload.qrCode.trim().length > 0;
  const hasSecret =
    typeof payload.secret === 'string' && payload.secret.trim().length > 0;
  if (!hasQr && !hasSecret && msg) {
    return msg;
  }

  return undefined;
}

/** Parse a JSON text body from the Orb QR init upstream / proxy. */
export function extractOrbQrFailureFromBody(body: string): string | undefined {
  const trimmed = body.trim();
  if (!trimmed) return undefined;
  try {
    return extractOrbQrFailureMessage(JSON.parse(trimmed) as unknown);
  } catch {
    return undefined;
  }
}

/**
 * SDK parseInitResponse wrapper: surface Orb's FAILED `msg` instead of the opaque
 * "QR init response did not include qrCode and secret" error.
 */
export function parseOrbQrInitResponse(payload: unknown): ParsedQrInitResponse {
  const failure = extractOrbQrFailureMessage(payload);
  if (failure) {
    throw new Error(failure);
  }

  try {
    return parseQrInitResponse(payload);
  } catch (error) {
    const nestedFailure = extractOrbQrFailureMessage(payload);
    if (nestedFailure) {
      throw new Error(nestedFailure);
    }
    throw error;
  }
}
