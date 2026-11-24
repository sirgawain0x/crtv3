import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalFilesystemArchiveStorage } from "./local-storage";
import { MANIFEST_FILE } from "./manifest";

describe("LocalFilesystemArchiveStorage.readManifest", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    for (const dir of dirs) {
      try {
        const manifest = path.join(dir, MANIFEST_FILE);
        await chmod(manifest, 0o644).catch(() => undefined);
      } catch {
        // ignore
      }
    }
    dirs.length = 0;
  });

  it("returns null only for ENOENT; throws on I/O or JSON errors with manifest path", async () => {
    const missingDir = await mkdtemp(path.join(tmpdir(), "lp-manifest-missing-"));
    dirs.push(missingDir);
    const missingStorage = new LocalFilesystemArchiveStorage(missingDir);
    await expect(missingStorage.readManifest()).resolves.toBeNull();

    const corruptDir = await mkdtemp(path.join(tmpdir(), "lp-manifest-corrupt-"));
    dirs.push(corruptDir);
    const corruptStorage = new LocalFilesystemArchiveStorage(corruptDir);
    const corruptPath = path.join(corruptDir, MANIFEST_FILE);
    await writeFile(corruptPath, "{not-json\n", "utf8");
    await expect(corruptStorage.readManifest()).rejects.toThrow(
      new RegExp(`Failed to parse archive manifest at ${corruptPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    );

    const ioDir = await mkdtemp(path.join(tmpdir(), "lp-manifest-io-"));
    dirs.push(ioDir);
    const ioStorage = new LocalFilesystemArchiveStorage(ioDir);
    const ioPath = path.join(ioDir, MANIFEST_FILE);
    await writeFile(ioPath, '{"version":1}\n', "utf8");
    await chmod(ioPath, 0o000);
    await expect(ioStorage.readManifest()).rejects.toThrow(
      new RegExp(`Failed to read archive manifest at ${ioPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    );
  });
});