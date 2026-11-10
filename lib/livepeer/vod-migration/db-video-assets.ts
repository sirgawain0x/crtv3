import type { VideoAssetDbRow } from "./types";

export type VideoAssetsDbClient = {
  listVideoAssetsForInventory(): Promise<VideoAssetDbRow[]>;
};

export type SupabaseLikeClient = {
  from(table: string): {
    select(columns: string): {
      range(from: number, to: number): Promise<{
        data: VideoAssetDbRow[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

const PAGE = 1000;

/** Read-only paginated load of `video_assets` rows for inventory cross-reference. */
export async function listVideoAssetsFromSupabase(
  client: SupabaseLikeClient,
): Promise<VideoAssetDbRow[]> {
  const rows: VideoAssetDbRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client
      .from("video_assets")
      .select("id, asset_id, playback_id, title, status, creator_id")
      .range(offset, offset + PAGE - 1);
    if (error) {
      throw new Error(`Supabase video_assets read failed: ${error.message}`);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}
