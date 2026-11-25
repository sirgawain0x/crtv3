import path from 'node:path';
import { access } from 'node:fs/promises';
import { relativePathForAsset } from '@/lib/livepeer/vod-migration/archive/paths';
import type { ArchivedSource } from './archive';
import { openLocalImportSource } from './local-source';

/** Local mirror of the checksum-verified MEGA archive (`/crtv3-vod-archive/...`). No remote credentials in code. */
export function resolveMigrationArchiveRoot(): string | undefined {
  const root = process.env.FRAMEWORKS_MIGRATION_ARCHIVE_ROOT?.trim();
  return root || undefined;
}

export function resolveArchiveSourceFile(
  archiveRoot: string,
  source: ArchivedSource,
  suggestedFilename?: string,
): string {
  const relative = relativePathForAsset(source.assetId, suggestedFilename, archiveRoot);
  return path.join(path.resolve(archiveRoot), relative);
}

export async function openArchiveImportSource(
  archiveRoot: string,
  source: ArchivedSource,
  suggestedFilename?: string,
) {
  const filePath = resolveArchiveSourceFile(archiveRoot, source, suggestedFilename);
  await access(filePath);
  return openLocalImportSource(filePath);
}