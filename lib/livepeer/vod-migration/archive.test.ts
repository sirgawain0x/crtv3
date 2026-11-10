import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { archiveStudioAssets } from "./archive/archiver";
import { sha256Buffer } from "./archive/checksum";
import type { ArchiveManifest, ArchiveStorageBackend, StudioAssetRecord } from "./types";

function memoryStorage(): ArchiveStorageBackend & {
  files: Map<string, Buffer>;
  manifest: ArchiveManifest | null;
} {
  const files = new Map<string, Buffer>();
  let manifest: ArchiveManifest | null = null;
  const storage: ArchiveStorageBackend & {
    files: Map<string, Buffer>;
    manifest: ArchiveManifest | null;
  } = {
    root: "/tmp/archive-test",
    files,
    get manifest() {
      return manifest;
    },
    set manifest(v) {
      manifest = v;
    },
    async fileExists(rel) {
      return files.has(rel);
    },
    async readFile(rel) {
      const buf = files.get(rel);
      if (!buf) throw new Error("missing");
      return buf;
    },
    async writeFile(rel, data) {
      files.set(rel, data);
    },
    async writeFileFromStream(rel, stream) {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const data = Buffer.concat(chunks);
      files.set(rel, data);
      return { sha256: sha256Buffer(data), sizeBytes: data.length };
    },
    async readManifest() {
      return manifest;
    },
    async writeManifest(next) {
      manifest = next;
    },
  };
  return storage;
}

const assets: StudioAssetRecord[] = [
  {
    assetId: "a1",
    playbackId: null,
    name: "one",
    statusPhase: "ready",
    sizeBytes: 4,
    durationSeconds: 1,
    hasDownloadUrl: true,
    hasSourceUrl: false,
  },
];

describe("archiveStudioAssets", () => {
  it("resumes by skipping manifest-complete files", async () => {
    const storage = memoryStorage();
    const data = Buffer.from("abcd");
    const relativePath = "assets/a1/a1.mp4";
    storage.files.set(relativePath, data);
    const sha256 = sha256Buffer(data);
    await storage.writeManifest({
      version: 1,
      destinationRoot: storage.root,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: {
        a1: {
          assetId: "a1",
          relativePath,
          sha256,
          sizeBytes: data.length,
          completedAt: new Date().toISOString(),
        },
      },
    });

    const download = vi.fn();
    const { results } = await archiveStudioAssets({
      assets,
      storage,
      download,
    });
    expect(results).toEqual([{ assetId: "a1", status: "skipped", bytes: 4 }]);
    expect(download).not.toHaveBeenCalled();
  });

  it("reports checksum mismatch when on-disk file differs from manifest", async () => {
    const storage = memoryStorage();
    const relativePath = "assets/a1/a1.mp4";
    storage.files.set(relativePath, Buffer.from("wrong"));
    await storage.writeManifest({
      version: 1,
      destinationRoot: storage.root,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: {
        a1: {
          assetId: "a1",
          relativePath,
          sha256: sha256Buffer(Buffer.from("abcd")),
          sizeBytes: 4,
          completedAt: new Date().toISOString(),
        },
      },
    });

    const { results } = await archiveStudioAssets({
      assets,
      storage,
      download: vi.fn(),
    });
    expect(results[0]?.status).toBe("checksum_mismatch");
  });

  it("streams downloads and updates manifest", async () => {
    const storage = memoryStorage();
    const payload = new TextEncoder().encode("video-bytes");
    async function* gen() {
      yield payload;
    }
    const { results, manifest } = await archiveStudioAssets({
      assets,
      storage,
      download: async () => ({ stream: gen(), suggestedFilename: "clip.mp4" }),
    });
    expect(results[0]).toMatchObject({ status: "archived", bytes: payload.length });
    expect(manifest.entries.a1?.sha256).toBe(
      createHash("sha256").update(Buffer.from(payload)).digest("hex"),
    );
    expect(storage.files.has("assets/a1/clip.mp4")).toBe(true);
  });
});
