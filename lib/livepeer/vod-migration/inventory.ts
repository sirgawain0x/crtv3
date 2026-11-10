import type {
  DbCrossReferenceStatus,
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

function computeStudioTotals(studioRows: InventoryRow[]): Pick<
  InventoryTotals,
  "studioAssetCount" | "totalBytes" | "bytesUnknownCount" | "missingOrFailedCount" | "linkedCount" | "studioOrphanCount"
> {
  let totalBytes = 0;
  let bytesUnknownCount = 0;
  let missingOrFailedCount = 0;
  let linkedCount = 0;
  let studioOrphanCount = 0;

  for (const row of studioRows) {
    if (row.dbLinked) linkedCount++;
    if (row.orphanSide === "studio_only") studioOrphanCount++;
    if (isMissingOrFailed(row)) missingOrFailedCount++;
    if (row.sizeBytes === null) bytesUnknownCount++;
    else totalBytes += row.sizeBytes;
  }

  return {
    studioAssetCount: studioRows.length,
    totalBytes,
    bytesUnknownCount,
    missingOrFailedCount,
    linkedCount,
    studioOrphanCount,
  };
}

export function buildInventoryReport(params: {
  studioAssets: StudioAssetRecord[];
  dbRows: VideoAssetDbRow[];
  studioApiBaseUrl: string;
  dbCrossReference: DbCrossReferenceStatus;
  generatedAt?: string;
  studioListPageCount?: number;
}): InventoryReport {
  const dbByAssetId = new Map<string, VideoAssetDbRow>();
  for (const row of params.dbRows) {
    if (row.asset_id) dbByAssetId.set(row.asset_id, row);
  }

  const studioAssetIds = new Set(params.studioAssets.map((a) => a.assetId));

  const studioRows: InventoryRow[] = params.studioAssets.map((asset) => {
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

  const studioOnlyOrphans = studioRows.filter((r) => r.orphanSide === "studio_only");

  const studioPart = computeStudioTotals(studioRows);

  const totals: InventoryTotals = {
    ...studioPart,
    dbRowCount: params.dbRows.length,
    dbOrphanCount: dbOnlyOrphans.length,
  };

  return {
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    studioApiBaseUrl: params.studioApiBaseUrl,
    dbCrossReference: params.dbCrossReference,
    studioRows,
    studioOnlyOrphans,
    dbOnlyOrphans,
    rows: studioRows,
    totals,
    studioListPageCount: params.studioListPageCount,
  };
}

export function formatInventoryTotalsLine(
  totals: InventoryTotals,
  dbCrossReference?: DbCrossReferenceStatus,
): string {
  const mb = (totals.totalBytes / (1024 * 1024)).toFixed(2);
  const dbLine =
    dbCrossReference === "skipped"
      ? "DB cross-reference: SKIPPED (--skip-db)"
      : "DB cross-reference: ok";
  return [
    dbLine,
    `Studio assets: ${totals.studioAssetCount}`,
    `Total size (known): ${totals.totalBytes} bytes (${mb} MiB)`,
    `Size unknown: ${totals.bytesUnknownCount} assets`,
    `Missing/failed or no source URL: ${totals.missingOrFailedCount}`,
    `DB rows (all video_assets): ${totals.dbRowCount}`,
    `Linked (studio ∩ DB): ${totals.linkedCount}`,
    `Studio-only orphans: ${totals.studioOrphanCount}`,
    `DB-only orphans: ${totals.dbOrphanCount}`,
  ].join("\n");
}
