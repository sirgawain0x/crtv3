import { clearStoredOrbSession } from '@/lib/sdk/orb/login';

/** Extract a message from Error, string, or SDK objects with a `message` field. */
export function getOrbErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return '';
}

/** Lens / Orb errors when refresh tokens were revoked (sign-out elsewhere, expired auth). */
export function isRevokedOrbSessionError(error: unknown): boolean {
  const lower = getOrbErrorMessage(error).toLowerCase();
  return (
    lower.includes('renew a revoked authentication') ||
    lower.includes('revoked authentication') ||
    (lower.includes('revoked') && lower.includes('authentication'))
  );
}

/** Session has access token but cannot resume Lens writes (missing refresh). */
export function isIncompleteOrbSessionError(error: unknown): boolean {
  const lower = getOrbErrorMessage(error).toLowerCase();
  return (
    lower.includes('missing a refresh token') ||
    lower.includes('orb session is incomplete')
  );
}

/** Auth failures that mean the cached Orb session should be dropped. */
export function isStaleOrbSessionError(error: unknown): boolean {
  if (isRevokedOrbSessionError(error)) return true;
  if (isIncompleteOrbSessionError(error)) return true;

  const lower = getOrbErrorMessage(error).toLowerCase();
  return (
    lower.includes('401') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid orb access token') ||
    lower.includes('session expired') ||
    lower.includes('token expired')
  );
}

/** Clears local Orb tokens when `error` indicates the session is no longer valid. */
export function clearStaleOrbSessionIfNeeded(error: unknown): boolean {
  if (!isStaleOrbSessionError(error)) return false;
  clearStoredOrbSession();
  return true;
}
