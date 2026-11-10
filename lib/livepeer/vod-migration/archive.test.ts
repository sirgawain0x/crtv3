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
  return {
    root: "/tmp/archive-test",
    files,
    manifest,
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
    async readManifest() {
      return manifest;
    },
    async writeManifest(next) {
      manifest = next;
      Object.assign(this, { manifest: next });
    },
  };
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

  it("writes new files and updates manifest", async () => {
    const storage = memoryStorage();
    const payload = Buffer.from("video-bytes");
    const { results, manifest } = await archiveStudioAssets({
      assets,
      storage,
      download: async () => ({ data: payload, suggestedFilename: "clip.mp4" }),
    });
    expect(results[0]).toMatchObject({ status: "archived", bytes: payload.length });
    expect(manifest.entries.a1?.sha256).toBe(sha256Buffer(payload));
    expect(storage.files.has("assets/a1/clip.mp4")).toBe(true);
  });
});
