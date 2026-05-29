/** Strip whitespace and optional surrounding quotes from env values. */
export function normalizeEnvSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^["']|["']$/g, '') || undefined;
}

/** Prefer full-access key for Studio routes; fall back to LIVEPEER_API_KEY. */
export function resolveLivepeerStudioAuthToken(): string | undefined {
  const full = normalizeEnvSecret(process.env.LIVEPEER_FULL_API_KEY);
  const standard = normalizeEnvSecret(process.env.LIVEPEER_API_KEY);
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
