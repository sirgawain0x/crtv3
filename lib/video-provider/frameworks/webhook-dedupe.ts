const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const seenEventIds = new Map<string, number>();

function pruneExpired(now: number): void {
  for (const [id, expiresAt] of seenEventIds) {
    if (expiresAt <= now) seenEventIds.delete(id);
  }
}

/** Returns false when this event id was already processed recently. */
export function claimFrameworksWebhookEvent(eventId: string): boolean {
  const now = Date.now();
  pruneExpired(now);
  if (seenEventIds.has(eventId)) return false;
  seenEventIds.set(eventId, now + DEDUPE_TTL_MS);
  return true;
}

export function resetFrameworksWebhookDedupeForTests(): void {
  seenEventIds.clear();
}
