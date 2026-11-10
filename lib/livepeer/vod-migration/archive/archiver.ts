import type { ArchiveManifest, ArchiveStorageBackend, StudioAssetRecord } from "../types";
import { sha256Buffer } from "./checksum";
import { createEmptyManifest, touchManifest } from "./manifest";

export type ArchiveDownloadFn = (
  assetId: string,
) => Promise<{ data: Buffer; suggestedFilename?: string }>;

export type ArchiveAssetResult =
  | { assetId: string; status: "skipped" | "archived"; bytes: number }
  | { assetId: string; status: "checksum_mismatch"; expected: string; actual: string }
  | { assetId: string; status: "error"; message: string };

function relativePathForAsset(assetId: string, suggestedFilename?: string): string {
  const safeName = (suggestedFilename ?? `${assetId}.mp4`).replace(/[^\w.\-]+/g, "_");
  return `assets/${assetId}/${safeName}`;
}

async function verifyExistingFile(
  storage: ArchiveStorageBackend,
  relativePath: string,
  expectedSha256: string,
): Promise<"ok" | "checksum_mismatch" | "missing"> {
  const exists = await storage.fileExists(relativePath);
  if (!exists) return "missing";
  const data = await storage.readFile(relativePath);
  const actual = sha256Buffer(data);
  return actual === expectedSha256 ? "ok" : "checksum_mismatch";
}

/**
 * Archive Studio source files (explicit --archive only). Resumable via manifest; skips completed files.
 */
export async function archiveStudioAssets(params: {
  assets: StudioAssetRecord[];
  storage: ArchiveStorageBackend;
  download: ArchiveDownloadFn;
  existingManifest?: ArchiveManifest | null;
}): Promise<{ manifest: ArchiveManifest; results: ArchiveAssetResult[] }> {
  const manifest =
    params.existingManifest ??
    (await params.storage.readManifest()) ??
    createEmptyManifest(params.storage.root);

  const results: ArchiveAssetResult[] = [];

  for (const asset of params.assets) {
    const prior = manifest.entries[asset.assetId];
    if (prior) {
      const check = await verifyExistingFile(
        params.storage,
        prior.relativePath,
        prior.sha256,
      );
      if (check === "ok") {
        results.push({ assetId: asset.assetId, status: "skipped", bytes: prior.sizeBytes });
        continue;
      }
      if (check === "checksum_mismatch") {
        const data = await params.storage.readFile(prior.relativePath);
        results.push({
          assetId: asset.assetId,
          status: "checksum_mismatch",
          expected: prior.sha256,
          actual: sha256Buffer(data),
        });
        continue;
      }
    }

    try {
      const { data, suggestedFilename } = await params.download(asset.assetId);
      const sha256 = sha256Buffer(data);
      const relativePath = relativePathForAsset(asset.assetId, suggestedFilename);

      if (prior && prior.relativePath === relativePath) {
        const check = await verifyExistingFile(
          params.storage,
          relativePath,
          prior.sha256,
        );
        if (check === "checksum_mismatch") {
          results.push({
            assetId: asset.assetId,
            status: "checksum_mismatch",
            expected: prior.sha256,
            actual: sha256,
          });
          continue;
        }
      }

      await params.storage.writeFile(relativePath, data);
      manifest.entries[asset.assetId] = {
        assetId: asset.assetId,
        relativePath,
        sha256,
        sizeBytes: data.length,
        completedAt: new Date().toISOString(),
      };
      const next = touchManifest(manifest);
      Object.assign(manifest, next);
      await params.storage.writeManifest(manifest);
      results.push({ assetId: asset.assetId, status: "archived", bytes: data.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ assetId: asset.assetId, status: "error", message });
    }
  }

  await params.storage.writeManifest(touchManifest(manifest));
  return { manifest, results };
}
