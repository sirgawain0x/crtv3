import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ArchiveManifest, ArchiveStorageBackend, StreamWriteResult } from "../types";
import { sha256FileOnDisk } from "./file-hash";
import { MANIFEST_FILE } from "./manifest";

export class LocalFilesystemArchiveStorage implements ArchiveStorageBackend {
  readonly root: string;
  private readonly manifestPath: string;
  private readonly rootWithSep: string;

  constructor(destinationRoot: string) {
    this.root = path.resolve(destinationRoot);
    this.rootWithSep = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;
    this.manifestPath = path.join(this.root, MANIFEST_FILE);
  }

  private resolve(relativePath: string): string {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = path.resolve(this.root, normalized);
    if (full !== this.root && !full.startsWith(this.rootWithSep)) {
      throw new Error(`Path escapes archive root: ${relativePath}`);
    }
    return full;
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      await stat(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async readFile(relativePath: string): Promise<Buffer> {
    return readFile(this.resolve(relativePath));
  }

  async sha256File(relativePath: string): Promise<{ sha256: string; sizeBytes: number }> {
    return sha256FileOnDisk(this.resolve(relativePath));
  }

  async quarantineFile(relativePath: string): Promise<string> {
    const full = this.resolve(relativePath);
    const base = path.basename(relativePath);
    const quarantineRel = path
      .join("quarantine", relativePath.replace(/\\/g, "/").replace(/\//g, "__"), `${base}.mismatch-${Date.now()}`)
      .replace(/\\/g, "/");
    const dest = this.resolve(quarantineRel);
    await mkdir(path.dirname(dest), { recursive: true });
    await rename(full, dest);
    return quarantineRel;
  }

  async writeFile(relativePath: string, data: Buffer): Promise<void> {
    const full = this.resolve(relativePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async writeFileFromStream(
    relativePath: string,
    stream: AsyncIterable<Uint8Array>,
  ): Promise<StreamWriteResult> {
    const full = this.resolve(relativePath);
    await mkdir(path.dirname(full), { recursive: true });
    const tempPath = `${full}.part-${process.pid}-${Date.now()}`;
    const hash = createHash("sha256");
    let sizeBytes = 0;

    const hashTransform = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk);
        sizeBytes += chunk.length;
        callback(null, chunk);
      },
    });

    try {
      await pipeline(Readable.from(stream), hashTransform, createWriteStream(tempPath));
      await rename(tempPath, full);
      return { sha256: hash.digest("hex"), sizeBytes };
    } catch (err) {
      await unlink(tempPath).catch(() => undefined);
      throw err;
    }
  }

  async readManifest(): Promise<ArchiveManifest | null> {
    try {
      const raw = await readFile(this.manifestPath, "utf8");
      return JSON.parse(raw) as ArchiveManifest;
    } catch {
      return null;
    }
  }

  async writeManifest(manifest: ArchiveManifest): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(this.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
}
