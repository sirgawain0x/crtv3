import { isRevokedOrbSessionError } from '@/lib/sdk/orb/session-errors';

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
    return 'Sign-in was blocked by security checks. Try a private window with extensions off, or try again in a minute.';
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
  if (isRevokedOrbSessionError(error)) {
    return 'Your Orb session was signed out. Sign in again with Orb to interact on Lens.';
  }
  if (lower.includes('wallet not connected') || lower.includes('sign in with your wallet')) {
    return 'Connect your wallet with Get Started before linking your Lens identity.';
  }
  if (lower.includes('user rejected') || lower.includes('denied')) {
    return 'Wallet signature was cancelled. Approve the signature to link your profile.';
  }
  if (
    lower.includes('lens_account_id') &&
    (lower.includes('schema cache') || lower.includes('could not find'))
  ) {
    return 'Database is missing Orb/Lens profile columns. Run scripts/add-orb-lens-columns-to-creator-profiles.sql in the Supabase SQL Editor, then try again.';
  }
  if (
    lower.includes('creator_profiles_orb_account_id_key') ||
    lower.includes('already linked to another profile')
  ) {
    return 'This Orb account is already linked to a different wallet profile. Connect the wallet you used before, or contact support to transfer the link.';
  }

  return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
}
