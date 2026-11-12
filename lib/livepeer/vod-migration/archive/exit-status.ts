import type { ArchiveAssetResult } from "./archiver";

export function archiveHasBlockingFailures(results: ArchiveAssetResult[]): boolean {
  return results.some(
    (r) => r.status === "error" || r.status === "checksum_mismatch",
  );
}

export function formatArchiveRunSummary(params: {
  destinationRoot: string;
  manifestEntryCount: number;
  results: ArchiveAssetResult[];
}): string {
  const archived = params.results.filter((r) => r.status === "archived").length;
  const skipped = params.results.filter((r) => r.status === "skipped").length;
  const mismatches = params.results.filter((r) => r.status === "checksum_mismatch").length;
  const errors = params.results.filter((r) => r.status === "error").length;
  return [
    `Archive destination: ${params.destinationRoot}`,
    `Manifest entries: ${params.manifestEntryCount}`,
    `Archived this run: ${archived}`,
    `Skipped (resumed): ${skipped}`,
    `Checksum mismatches: ${mismatches}`,
    `Errors: ${errors}`,
  ].join("\n");
}
