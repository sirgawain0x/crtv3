const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const seenEventIds = new Map<string, number>();

function pruneExpired(now: number): void {
  for (const [id, expiresAt] of seenEventIds) {
    if (expiresAt <= now) seenEventIds.delete(id);
  }
}

/** True when this event id was successfully processed recently. */
export function isFrameworksWebhookDuplicate(eventId: string): boolean {
  const now = Date.now();
  pruneExpired(now);
  return seenEventIds.has(eventId);
}

/** Record successful processing so retries are deduplicated. */
export function markFrameworksWebhookProcessed(eventId: string): void {
  const now = Date.now();
  pruneExpired(now);
  seenEventIds.set(eventId, now + DEDUPE_TTL_MS);
}

export function resetFrameworksWebhookDedupeForTests(): void {
  seenEventIds.clear();
}
