import type { ArchiveManifest, ArchiveStorageBackend, StudioAssetRecord } from "../types";
import { createEmptyManifest, touchManifest } from "./manifest";

export type ArchiveDownloadFn = (
  assetId: string,
) => Promise<{
  stream: AsyncIterable<Uint8Array>;
  suggestedFilename?: string;
}>;

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
): Promise<"ok" | "checksum_mismatch" | "missing" | { mismatch: { actual: string } }> {
  const exists = await storage.fileExists(relativePath);
  if (!exists) return "missing";
  const actual = await storage.sha256File(relativePath);
  return actual === expectedSha256 ? "ok" : { mismatch: { actual } };
}

function toAsyncIterable(body: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>) {
  if (
    typeof body === "object" &&
    body !== null &&
    Symbol.asyncIterator in body &&
    typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function"
  ) {
    return body as AsyncIterable<Uint8Array>;
  }
  const reader = (body as ReadableStream<Uint8Array>).getReader();
  return {
    async *[Symbol.asyncIterator]() {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
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
      if (typeof check === "object" && "mismatch" in check) {
        results.push({
          assetId: asset.assetId,
          status: "checksum_mismatch",
          expected: prior.sha256,
          actual: check.mismatch.actual,
        });
        continue;
      }
    }

    try {
      const { stream, suggestedFilename } = await params.download(asset.assetId);
      const relativePath = relativePathForAsset(asset.assetId, suggestedFilename);
      const iterable = toAsyncIterable(
        stream as ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
      );
      const { sha256, sizeBytes } = await params.storage.writeFileFromStream(
        relativePath,
        iterable,
      );

      if (prior && prior.relativePath === relativePath && prior.sha256 !== sha256) {
        results.push({
          assetId: asset.assetId,
          status: "checksum_mismatch",
          expected: prior.sha256,
          actual: sha256,
        });
        continue;
      }

      manifest.entries[asset.assetId] = {
        assetId: asset.assetId,
        relativePath,
        sha256,
        sizeBytes,
        completedAt: new Date().toISOString(),
      };
      Object.assign(manifest, touchManifest(manifest));
      await params.storage.writeManifest(manifest);
      results.push({ assetId: asset.assetId, status: "archived", bytes: sizeBytes });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ assetId: asset.assetId, status: "error", message });
    }
  }

  await params.storage.writeManifest(touchManifest(manifest));
  return { manifest, results };
}
