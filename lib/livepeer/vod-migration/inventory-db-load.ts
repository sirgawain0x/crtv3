import type { DbCrossReferenceStatus, VideoAssetDbRow } from "./types";

export async function loadVideoAssetsForInventory(params: {
  skipDb: boolean;
  fetchDbRows: () => Promise<VideoAssetDbRow[]>;
}): Promise<{ rows: VideoAssetDbRow[]; dbCrossReference: DbCrossReferenceStatus }> {
  if (params.skipDb) {
    return { rows: [], dbCrossReference: "skipped" };
  }
  const rows = await params.fetchDbRows();
  return { rows, dbCrossReference: "ok" };
}
