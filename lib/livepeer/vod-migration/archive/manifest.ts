import type { ArchiveManifest } from "../types";

export const MANIFEST_FILE = "livepeer-archive-manifest.json";

export function createEmptyManifest(destinationRoot: string): ArchiveManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    destinationRoot,
    startedAt: now,
    updatedAt: now,
    entries: {},
  };
}

export function touchManifest(manifest: ArchiveManifest): ArchiveManifest {
  return {
    ...manifest,
    updatedAt: new Date().toISOString(),
  };

}
