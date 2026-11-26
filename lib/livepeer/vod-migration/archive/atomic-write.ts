import { randomBytes } from "node:crypto";
import type { FileHandle } from "node:fs/promises";
import { mkdir, open, readdir, rename, unlink, writeFile as writeFileRaw } from "node:fs/promises";
import path from "node:path";

async function fsyncDirectoryBestEffort(dirPath: string): Promise<void> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(dirPath, "r");
    await handle.sync();
  } catch {
    // Directory fsync is optional (not supported on all platforms).
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function writeEntireBuffer(handle: FileHandle, payload: Buffer): Promise<void> {
  let offset = 0;
  while (offset < payload.length) {
    const { bytesWritten } = await handle.write(payload, offset);
    if (bytesWritten <= 0) {
      throw new Error(
        `Incomplete atomic write at offset ${offset}/${payload.length}: write returned ${bytesWritten}`,
      );
    }
    offset += bytesWritten;
  }
}

/**
 * Atomically replace a file: write temp in the same directory, fsync, close, rename.
 * On failure, remove the temp file and leave the previous target unchanged.
 */
export async function writeFileAtomically(targetPath: string, data: string | Buffer): Promise<void> {
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath);
  const tempPath = path.join(dir, `${base}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`);

  await mkdir(dir, { recursive: true });

  let handle: FileHandle | undefined;
  try {
    handle = await open(tempPath, "w", 0o644);
    const payload = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    await writeEntireBuffer(handle, payload);
    await handle.sync();
    await handle.close();
    handle = undefined;

    await rename(tempPath, targetPath);
    await fsyncDirectoryBestEffort(dir);
  } catch (err) {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
    await unlink(tempPath).catch(() => undefined);
    throw err;
  }
}

/** Test helper: seed a file without the atomic writer (simulates pre-existing manifest). */
export async function seedFileForTests(targetPath: string, data: string): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFileRaw(targetPath, data, "utf8");
}

export async function listFilesInDirectory(dirPath: string): Promise<string[]> {
  try {
    return await readdir(dirPath);
  } catch {
    return [];
  }
}