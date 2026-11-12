import { writeFile } from "node:fs/promises";
import type { InventoryReport, InventoryRow } from "./types";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCsv(row: InventoryRow): string {
  const fields = [
    row.assetId,
    row.playbackId ?? "",
    row.name ?? "",
    row.statusPhase ?? "",
    row.sizeBytes === null ? "" : String(row.sizeBytes),
    row.durationSeconds === null ? "" : String(row.durationSeconds),
    row.hasDownloadUrl ? "true" : "false",
    row.hasSourceUrl ? "true" : "false",
    row.dbRowId === null ? "" : String(row.dbRowId),
    row.dbTitle ?? "",
    row.dbStatus ?? "",
    row.dbLinked ? "true" : "false",
    row.orphanSide,
  ];
  return fields.map((f) => csvEscape(f)).join(",");
}

const CSV_HEADER =
  "asset_id,playback_id,name,status_phase,size_bytes,duration_seconds,has_download_url,has_source_url,db_row_id,db_title,db_status,db_linked,orphan_side";

export async function writeInventoryJson(
  path: string,
  report: InventoryReport,
): Promise<void> {
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function writeInventoryCsv(
  path: string,
  report: InventoryReport,
): Promise<void> {
  const lines = [CSV_HEADER, ...report.rows.map(rowToCsv)];
  await writeFile(path, `${lines.join("\n")}\n`, "utf8");
}
