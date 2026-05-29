export type ParsedViewMetrics = {
  playbackId: string;
  viewCount: number;
  playtimeMins: number;
  legacyViewCount: number;
};

/** Livepeer error payloads may appear in JSON even when HTTP status is 200. */
export function hasLivepeerErrors(rawData: unknown): boolean {
  if (!rawData || typeof rawData !== 'object') return false;
  const errors = (rawData as { errors?: unknown }).errors;
  if (errors == null) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  return true;
}

/**
 * Normalize Livepeer viewership payloads (object, array, or SDK `{ data }` wrapper).
 */
export function parseLivepeerViewMetricsBody(
  rawData: unknown,
  playbackId: string,
): ParsedViewMetrics | null {
  if (rawData == null) return null;

  if (hasLivepeerErrors(rawData)) return null;

  if (
    typeof rawData === 'object' &&
    'data' in rawData &&
    (rawData as { data?: unknown }).data != null &&
    typeof (rawData as { data?: unknown }).data === 'object'
  ) {
    return parseLivepeerViewMetricsBody(
      (rawData as { data: unknown }).data,
      playbackId,
    );
  }

  if (Array.isArray(rawData)) {
    if (rawData.length === 0) {
      return {
        playbackId,
        viewCount: 0,
        playtimeMins: 0,
        legacyViewCount: 0,
      };
    }

    const items = rawData.filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === 'object',
    );

    return {
      playbackId,
      viewCount: items.reduce(
        (sum, item) => sum + (Number(item.viewCount ?? 0) || 0),
        0,
      ),
      playtimeMins: items.reduce(
        (sum, item) => sum + (Number(item.playtimeMins ?? 0) || 0),
        0,
      ),
      legacyViewCount: items.reduce(
        (sum, item) => sum + (Number(item.legacyViewCount ?? 0) || 0),
        0,
      ),
    };
  }

  if (typeof rawData === 'object') {
    const record = rawData as Record<string, unknown>;
    return {
      playbackId: String(record.playbackId ?? playbackId),
      viewCount: Number(record.viewCount ?? 0) || 0,
      playtimeMins: Number(record.playtimeMins ?? 0) || 0,
      legacyViewCount: Number(record.legacyViewCount ?? 0) || 0,
    };
  }

  return null;
}
