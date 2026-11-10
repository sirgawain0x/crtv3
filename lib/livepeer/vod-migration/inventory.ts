import type {
  InventoryReport,
  InventoryRow,
  InventoryTotals,
  StudioAssetRecord,
  VideoAssetDbRow,
} from "./types";

const FAILED_PHASES = new Set([
  "failed",
  "error",
  "deleted",
  "deleted-processing",
]);

function isMissingOrFailed(asset: StudioAssetRecord): boolean {
  const phase = asset.statusPhase?.toLowerCase() ?? "";
  if (FAILED_PHASES.has(phase)) return true;
  if (phase && phase !== "ready" && phase !== "complete" && phase !== "completed") {
    return !asset.hasDownloadUrl && !asset.hasSourceUrl;
  }
  return !asset.hasDownloadUrl && !asset.hasSourceUrl;
}

function computeTotals(
  rows: InventoryRow[],
  dbOnlyOrphans: VideoAssetDbRow[],
  dbRowCount: number,
): InventoryTotals {
  let totalBytes = 0;
  let bytesUnknownCount = 0;
  let missingOrFailedCount = 0;
  let linkedCount = 0;
  let studioOrphanCount = 0;

  for (const row of rows) {
    if (row.dbLinked && row.orphanSide !== "db_only") linkedCount++;
    if (row.orphanSide === "studio_only") studioOrphanCount++;
    if (isMissingOrFailed(row)) missingOrFailedCount++;
    if (row.sizeBytes === null) bytesUnknownCount++;
    else totalBytes += row.sizeBytes;
  }

  return {
    studioAssetCount: rows.length,
    totalBytes,
    bytesUnknownCount,
    missingOrFailedCount,
    dbRowCount,
    linkedCount,
    studioOrphanCount,
    dbOrphanCount: dbOnlyOrphans.length,
  };
}

export function buildInventoryReport(params: {
  studioAssets: StudioAssetRecord[];
  dbRows: VideoAssetDbRow[];
  studioApiBaseUrl: string;
  generatedAt?: string;
}): InventoryReport {
  const dbByAssetId = new Map<string, VideoAssetDbRow>();
  for (const row of params.dbRows) {
    if (row.asset_id) dbByAssetId.set(row.asset_id, row);
  }

  const studioAssetIds = new Set(params.studioAssets.map((a) => a.assetId));
  const rows: InventoryRow[] = params.studioAssets.map((asset) => {
    const db = dbByAssetId.get(asset.assetId);
    const dbLinked = Boolean(db);
    return {
      ...asset,
      dbRowId: db?.id ?? null,
      dbTitle: db?.title ?? null,
      dbStatus: db?.status ?? null,
      dbLinked,
      orphanSide: dbLinked ? "none" : "studio_only",
    };
  });

  const dbOnlyOrphans: VideoAssetDbRow[] = params.dbRows.filter(
    (row) => !studioAssetIds.has(row.asset_id),
  );

  for (const orphan of dbOnlyOrphans) {
    rows.push({
      assetId: orphan.asset_id,
      playbackId: orphan.playback_id ?? null,
      name: orphan.title,
      statusPhase: null,
      sizeBytes: null,
      durationSeconds: null,
      hasDownloadUrl: false,
      hasSourceUrl: false,
      dbRowId: orphan.id,
      dbTitle: orphan.title,
      dbStatus: orphan.status,
      dbLinked: true,
      orphanSide: "db_only",
    });
  }

  const totals = computeTotals(rows, dbOnlyOrphans, params.dbRows.length);

  return {
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    studioApiBaseUrl: params.studioApiBaseUrl,
    rows,
    dbOnlyOrphans,
    totals,
  };
}

export function formatInventoryTotalsLine(totals: InventoryTotals): string {
  const mb = (totals.totalBytes / (1024 * 1024)).toFixed(2);
  return [
    `Studio assets: ${totals.studioAssetCount}`,
    `Total size (known): ${totals.totalBytes} bytes (${mb} MiB)`,
    `Size unknown: ${totals.bytesUnknownCount} assets`,
    `Missing/failed or no source URL: ${totals.missingOrFailedCount}`,
    `DB rows (linked + db-only orphans): ${totals.dbRowCount}`,
    `Linked (studio ∩ DB): ${totals.linkedCount}`,
    `Studio-only orphans: ${totals.studioOrphanCount}`,
    `DB-only orphans: ${totals.dbOrphanCount}`,
  ].join("\n");
}
