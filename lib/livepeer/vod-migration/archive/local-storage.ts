import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ArchiveManifest, ArchiveStorageBackend } from "../types";
import { MANIFEST_FILE } from "./manifest";

export class LocalFilesystemArchiveStorage implements ArchiveStorageBackend {
  readonly root: string;
  private readonly manifestPath: string;

  constructor(destinationRoot: string) {
    this.root = path.resolve(destinationRoot);
    this.manifestPath = path.join(this.root, MANIFEST_FILE);
  }

  private resolve(relativePath: string): string {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = path.join(this.root, normalized);
    if (!full.startsWith(this.root)) {
      throw new Error(`Path escapes archive root: ${relativePath}`);
    }
    return full;
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      await readFile(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async readFile(relativePath: string): Promise<Buffer> {
    return readFile(this.resolve(relativePath));
  }

  async writeFile(relativePath: string, data: Buffer): Promise<void> {
    const full = this.resolve(relativePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
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
