import type { CreatorStockPickStored } from "@/lib/creator-stock-picks/validate-stock-pick";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCreatorStockPickFromRow(
  raw: unknown,
): CreatorStockPickStored | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (!isRecord(raw)) {
    return null;
  }
  const ticker = raw.ticker;
  const token_address = raw.token_address;
  const partner_url = raw.partner_url;
  if (
    typeof ticker !== "string" ||
    typeof token_address !== "string" ||
    typeof partner_url !== "string"
  ) {
    return null;
  }
  const note =
    raw.note === null || raw.note === undefined
      ? null
      : typeof raw.note === "string"
        ? raw.note
        : null;
  const video_asset_id =
    raw.video_asset_id === null || raw.video_asset_id === undefined
      ? null
      : typeof raw.video_asset_id === "string"
        ? raw.video_asset_id
        : null;
  return {
    ticker,
    token_address,
    partner_url,
    note,
    video_asset_id,
  };
}
