const URL_PATTERN = /https?:\/\/\S+/gi;

/** Redact signed URLs and bound length before persisting provider failure context. */
export function sanitizeProviderFailureReason(input: {
  phase: string;
  providerStatus?: string | null;
}): string {
  const phase = input.phase.trim().toLowerCase() || 'failed';
  const status = input.providerStatus?.trim();
  const raw = status && status.toLowerCase() !== phase ? `${phase}: ${status}` : phase;
  return raw.replace(URL_PATTERN, '[redacted-url]').replace(/\s+/g, ' ').trim().slice(0, 500);
}