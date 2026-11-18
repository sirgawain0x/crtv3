import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArchiveManifest } from "../types";

const renameFailure = vi.hoisted(() => ({ enabled: false }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
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