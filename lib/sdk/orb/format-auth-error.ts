/** User-facing copy for Orb QR / link failures (init proxy, poll, SDK). */
export function formatOrbAuthError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Orb sign-in failed';

  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (lower.includes('access denied') || lower.includes('403')) {
    return 'Sign-in was blocked. Disable VPN or ad blockers, then try again.';
  }
  if (
    lower.includes('failed to reach orb') ||
    lower.includes('502') ||
    lower.includes('network') ||
    lower.includes('fetch failed')
  ) {
    return 'Orb sign-in is temporarily unavailable. Please try again in a moment.';
  }
  if (lower.includes('too many') || lower.includes('rate limit')) {
    return 'Too many sign-in attempts. Please wait a minute and try again.';
  }
  if (lower.includes('invalid orb access token') || lower.includes('401')) {
    return 'Your Orb session expired. Sign in again with the Orb app.';
  }
  if (lower.includes('wallet not connected') || lower.includes('sign in with your wallet')) {
    return 'Connect your wallet with Get Started before linking your Lens identity.';
  }
  if (lower.includes('user rejected') || lower.includes('denied')) {
    return 'Wallet signature was cancelled. Approve the signature to link your profile.';
  }

  return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
}
