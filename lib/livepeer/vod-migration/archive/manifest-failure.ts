import type { ArchiveManifest, ArchiveManifestEntry } from "../types";

export function markManifestEntryFailed(
  manifest: ArchiveManifest,
  prior: ArchiveManifestEntry,
  observed: { sha256: string; sizeBytes: number },
  quarantineRelativePath: string,
): void {
  manifest.entries[prior.assetId] = {
    ...prior,
    failed: {
      at: new Date().toISOString(),
      expectedSha256: prior.sha256,
      observedSha256: observed.sha256,
      observedSizeBytes: observed.sizeBytes,
      quarantineRelativePath,
    },
  };
}

export function clearManifestEntryFailed(entry: ArchiveManifestEntry): ArchiveManifestEntry {
  const { failed: _failed, ...rest } = entry;
  return rest;
}
