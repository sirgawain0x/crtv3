/** Livepeer Studio VOD inventory + archive (PR1 — read inventory; archive behind --archive). */

export type StudioAssetRecord = {
  assetId: string;
  playbackId: string | null;
  name: string | null;
  statusPhase: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  hasDownloadUrl: boolean;
  hasSourceUrl: boolean;
};

export type VideoAssetDbRow = {
  id: number;
  asset_id: string;
  playback_id: string;
  title: string;
  status: string;
  creator_id: string;
};

export type InventoryRow = StudioAssetRecord & {
  dbRowId: number | null;
  dbTitle: string | null;
  dbStatus: string | null;
  dbLinked: boolean;
  orphanSide: "none" | "studio_only" | "db_only";
};

export type InventoryTotals = {
  studioAssetCount: number;
  totalBytes: number;
  bytesUnknownCount: number;
  missingOrFailedCount: number;
  dbRowCount: number;
  linkedCount: number;
  studioOrphanCount: number;
  dbOrphanCount: number;
};

export type DbCrossReferenceStatus = "ok" | "skipped";

export type InventoryReport = {
  generatedAt: string;
  studioApiBaseUrl: string;
  dbCrossReference: DbCrossReferenceStatus;
  /** Studio API assets only (excludes db-only orphans). */
  studioRows: InventoryRow[];
  /** Studio assets with no matching `video_assets` row. */
  studioOnlyOrphans: InventoryRow[];
  /** `video_assets` rows with no Studio asset. */
  dbOnlyOrphans: VideoAssetDbRow[];
  /** Alias of `studioRows` for CSV export convenience. */
  rows: InventoryRow[];
  totals: InventoryTotals;
  studioListPageCount?: number;
};

export type ListStudioAssetsPage = {
  assets: StudioAssetRecord[];
  nextCursor: string | null;
};

export type StudioAssetListOptions = {
  baseUrl: string;
  authToken: string;
  pageSize?: number;
  fetchImpl?: typeof fetch;
};

export type ArchiveManifestEntryFailed = {
  at: string;
  expectedSha256: string;
  observedSha256: string;
  observedSizeBytes: number;
  quarantineRelativePath: string;
};

export type ArchiveManifestEntry = {
  assetId: string;
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  completedAt: string;
  /** Set after a verify/download mismatch; cleared on successful re-archive. */
  failed?: ArchiveManifestEntryFailed;
};

export type ArchiveManifest = {
  version: 1;
  destinationRoot: string;
  startedAt: string;
  updatedAt: string;
  entries: Record<string, ArchiveManifestEntry>;
};

export type StreamWriteResult = {
  sha256: string;
  sizeBytes: number;
};

export interface ArchiveStorageBackend {
  /** Absolute or backend-specific root for this archive run. */
  readonly root: string;
  fileExists(relativePath: string): Promise<boolean>;
  readFile(relativePath: string): Promise<Buffer>;
  writeFile(relativePath: string, data: Buffer): Promise<void>;
  sha256File(relativePath: string): Promise<{ sha256: string; sizeBytes: number }>;
  /** Move a mismatched file out of the canonical path into quarantine/. */
  quarantineFile(relativePath: string): Promise<string>;
  writeFileFromStream(
    relativePath: string,
    stream: AsyncIterable<Uint8Array>,
  ): Promise<StreamWriteResult>;
  readManifest(): Promise<ArchiveManifest | null>;
  writeManifest(manifest: ArchiveManifest): Promise<void>;
}
