import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArchiveManifest } from "../types";

const renameFailure = vi.hoisted(() => ({ enabled: false }));
const tempWriteMock = vi.hoisted(() => ({
  mode: "none" as "none" | "partial" | "zero",
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      const target = String(args[0]);
      if (tempWriteMock.mode !== "none" && target.includes(".tmp-")) {
        const realWrite = handle.write.bind(handle);
        handle.write = async (
          buffer: NodeJS.ArrayBufferView,
          offset?: number,
          length?: number,
          position?: number | null,
        ) => {
          if (tempWriteMock.mode === "zero") {
            return { bytesWritten: 0 };
          }
          if (tempWriteMock.mode === "partial") {
            const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            const start = offset ?? 0;
            const remaining = buf.length - start;
            const writeLen = Math.min(3, remaining);
            return realWrite(buf, start, writeLen, position ?? null);
          }
          return realWrite(buffer, offset, length, position);
        };
      }
      return handle;
    },
    rename: async (...args: Parameters<typeof actual.rename>) => {
      if (renameFailure.enabled) {
        throw new Error("simulated rename failure");
      }
      return actual.rename(...args);
    },
  };
});

import {
  listFilesInDirectory,
  seedFileForTests,
  writeFileAtomically,
} from "./atomic-write";
import { LocalFilesystemArchiveStorage } from "./local-storage";
import { MANIFEST_FILE } from "./manifest";

describe("writeFileAtomically", () => {
  afterEach(() => {
    renameFailure.enabled = false;
    tempWriteMock.mode = "none";
    vi.clearAllMocks();
  });

  it("replaces file on success", async () => {
    const workDir = await mkdtemp(path.join(tmpdir(), "lp-atomic-"));
    const target = path.join(workDir, MANIFEST_FILE);
    await seedFileForTests(target, '{"version":1,"entries":{}}\n');

    const next = '{"version":1,"entries":{"a1":{"assetId":"a1"}}}\n';
    await writeFileAtomically(target, next);

    const onDisk = await readFile(target, "utf8");
    expect(onDisk).toBe(next);
    const files = await listFilesInDirectory(workDir);
    expect(files.some((n) => n.includes(".tmp-"))).toBe(false);
  });

  it("writes all bytes via partial writes and rejects zero-length write attempts", async () => {
    const workDir = await mkdtemp(path.join(tmpdir(), "lp-atomic-"));
    const target = path.join(workDir, MANIFEST_FILE);
    const payload = '{"version":1,"entries":{"done":true}}\n';
    await seedFileForTests(target, '{"version":1}\n');

    tempWriteMock.mode = "partial";
    await writeFileAtomically(target, payload);
    await expect(readFile(target, "utf8")).resolves.toBe(payload);
    expect((await listFilesInDirectory(workDir)).some((n) => n.includes(".tmp-"))).toBe(false);

    const original = await readFile(target, "utf8");
    tempWriteMock.mode = "zero";
    await expect(writeFileAtomically(target, '{"never":true}\n')).rejects.toThrow(
      /Incomplete atomic write/,
    );
    await expect(readFile(target, "utf8")).resolves.toBe(original);
    expect((await listFilesInDirectory(workDir)).some((n) => n.includes(".tmp-"))).toBe(false);
  });

  it("leaves existing manifest unchanged when commit fails after temp write", async () => {
    const workDir = await mkdtemp(path.join(tmpdir(), "lp-atomic-"));
    const target = path.join(workDir, MANIFEST_FILE);
    const original =
      '{"version":1,"destinationRoot":"/data","entries":{"a1":{"sha256":"abc"}}}\n';
    await seedFileForTests(target, original);

    renameFailure.enabled = true;
    await expect(writeFileAtomically(target, '{"corrupt":true}\n')).rejects.toThrow(
      /simulated rename failure/,
    );

    const onDisk = await readFile(target, "utf8");
    expect(onDisk).toBe(original);

    const files = await listFilesInDirectory(workDir);
    expect(files).toEqual([MANIFEST_FILE]);
  });
});

describe("LocalFilesystemArchiveStorage.writeManifest", () => {
  it("persists manifest via atomic write", async () => {
    const workDir = await mkdtemp(path.join(tmpdir(), "lp-manifest-"));
    const storage = new LocalFilesystemArchiveStorage(workDir);
    const manifest: ArchiveManifest = {
      version: 1,
      destinationRoot: workDir,
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      entries: {
        x: {
          assetId: "x",
          relativePath: "assets/x/x.mp4",
          sha256: "deadbeef",
          sizeBytes: 10,
          completedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    await storage.writeManifest(manifest);
    const reread = await storage.readManifest();
    expect(reread?.entries.x?.sha256).toBe("deadbeef");

    const raw = await readFile(path.join(workDir, MANIFEST_FILE), "utf8");
    expect(JSON.parse(raw)).toMatchObject({ entries: { x: { sha256: "deadbeef" } } });
  });
});