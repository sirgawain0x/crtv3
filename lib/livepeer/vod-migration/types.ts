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

export type InventoryReport = {
  generatedAt: string;
  studioApiBaseUrl: string;
  rows: InventoryRow[];
  dbOnlyOrphans: VideoAssetDbRow[];
  totals: InventoryTotals;
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

export type ArchiveManifestEntry = {
  assetId: string;
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  completedAt: string;
};

export type ArchiveManifest = {
  version: 1;
  destinationRoot: string;
  startedAt: string;
  updatedAt: string;
  entries: Record<string, ArchiveManifestEntry>;
};

export interface ArchiveStorageBackend {
  /** Absolute or backend-specific root for this archive run. */
  readonly root: string;
  fileExists(relativePath: string): Promise<boolean>;
  readFile(relativePath: string): Promise<Buffer>;
  writeFile(relativePath: string, data: Buffer): Promise<void>;
  readManifest(): Promise<ArchiveManifest | null>;
  writeManifest(manifest: ArchiveManifest): Promise<void>;
}
