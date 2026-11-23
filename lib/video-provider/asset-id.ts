/** Asset IDs are opaque provider identifiers, never URLs or PostgREST filters. */
export function isVideoAssetId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(value);
}
