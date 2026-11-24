import { CREATIVE_TV_ASSET_UUID_REGEX } from '@/lib/utils/creative-tv-url';
export type ArchivedSource = { assetId: string; playbackId: string | null; sha256: string; sizeBytes: number };
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid archive manifest record');
  return value as RecordValue;
}
/** Accept the existing MEGA manifest and the archive CLI's manifest; never trust embedded paths/URLs. */
export function archivedSourcesFromManifests(manifests: unknown[]): ArchivedSource[] {
  const result = new Map<string, ArchivedSource>();
  for (const input of manifests) {
    const manifest = record(input);
    const entries = Array.isArray(manifest.assets) ? manifest.assets : Object.values(record(manifest.entries));
    for (const item of entries) {
      const entry = record(item);
      if (entry.status === 'skipped' || entry.status === 'failed' || entry.failed) continue;
      if (entry.status !== 'archived' && !entry.completedAt) throw new Error('Archive entry is not completed');
      const assetId = entry.assetId;
      const sha256 = entry.sha256;
      const sizeBytes = entry.bytes ?? entry.sizeBytes;
      if (typeof assetId !== 'string' || !CREATIVE_TV_ASSET_UUID_REGEX.test(assetId) ||
          typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256) ||
          typeof sizeBytes !== 'number' || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
        throw new Error('Archive entry has invalid identity, size or SHA-256');
      }
      if (result.has(assetId)) throw new Error('Duplicate archive source identity');
      result.set(assetId, { assetId, sha256, sizeBytes, playbackId: typeof entry.playbackId === 'string' ? entry.playbackId : null });
    }
  }
  return [...result.values()];
}
