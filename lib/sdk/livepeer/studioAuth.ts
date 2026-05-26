/** Prefer full-access key for Studio routes; fall back to LIVEPEER_API_KEY. */
export function resolveLivepeerStudioAuthToken(): string | undefined {
  const full = process.env.LIVEPEER_FULL_API_KEY?.trim();
  const standard = process.env.LIVEPEER_API_KEY?.trim();
  return full || standard || undefined;
}

export function livepeerStudioApiBaseUrl(): string {
  const raw =
    process.env.LIVEPEER_FULL_API_URL?.trim() || 'https://livepeer.studio';
  return raw.replace(/\/$/, '');
}

export const LIVEPEER_NOT_CONFIGURED = 'LIVEPEER_NOT_CONFIGURED' as const;
export const LIVEPEER_AUTH_FAILED = 'LIVEPEER_AUTH_FAILED' as const;

export function isLivepeerConfigured(): boolean {
  return Boolean(resolveLivepeerStudioAuthToken());
}
