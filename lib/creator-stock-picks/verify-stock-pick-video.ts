/** Livepeer asset_id on `video_assets` (UUID), not the serial `id` column. */
export const LIVEPEER_ASSET_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VideoAssetRow = {
  asset_id: string;
  creator_id: string;
  playback_id?: string | null;
};

export type StockPickVideoVerifyResult =
  | { ok: true; row: VideoAssetRow }
  | {
      ok: false;
      status: 400 | 403;
      error: string;
      field: "stock_pick_video_asset_id";
    };

export async function verifyStockPickVideoOwnership(
  lookupByLivepeerAssetId: (
    assetId: string,
  ) => Promise<VideoAssetRow | null>,
  ownerAddress: string,
  livepeerAssetId: string,
): Promise<StockPickVideoVerifyResult> {
  const trimmed = livepeerAssetId.trim();
  if (!LIVEPEER_ASSET_ID_UUID.test(trimmed)) {
    return {
      ok: false,
      status: 400,
      error: "Video link must be a Livepeer asset_id UUID",
      field: "stock_pick_video_asset_id",
    };
  }

  const row = await lookupByLivepeerAssetId(trimmed);
  if (!row) {
    return {
      ok: false,
      status: 400,
      error: "Linked video was not found",
      field: "stock_pick_video_asset_id",
    };
  }

  if (row.creator_id.toLowerCase() !== ownerAddress.toLowerCase()) {
    return {
      ok: false,
      status: 403,
      error: "You can only link your own videos",
      field: "stock_pick_video_asset_id",
    };
  }

  return { ok: true, row };
}
