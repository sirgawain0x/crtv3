import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openArchiveImportSource, resolveArchiveSourceFile } from './archive-source';

const source = {
  assetId: '51e1d8ff-d3ae-4f0a-918c-e0dfea796f1b',
  playbackId: 'play',
  sizeBytes: 4,
  sha256: createHash('sha256').update(Buffer.from([1, 2, 3, 4])).digest('hex'),
};

describe('archive import source', () => {
  let root: string;
  afterEach(async () => {
    if (root) await import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true }));
  });

  it('resolves canonical paths and verifies checksum from the archive mirror', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'fw-archive-'));
    const filePath = resolveArchiveSourceFile(root, source);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, Buffer.from([1, 2, 3, 4]));
    const handle = await openArchiveImportSource(root, source);
    try {
      await handle.verify(source);
      expect(Buffer.from(await handle.read(0, 4))).toEqual(Buffer.from([1, 2, 3, 4]));
    } finally {
      await handle.close();
    }
  });
});