/** Lens / Orb errors when refresh tokens were revoked (sign-out elsewhere, expired auth). */
export function isRevokedOrbSessionError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  const lower = msg.toLowerCase();
  return (
    lower.includes('renew a revoked authentication') ||
    lower.includes('revoked authentication') ||
    (lower.includes('revoked') && lower.includes('authentication'))
  );
}
