import type { CreatorStockPickStored } from "@/lib/creator-stock-picks/validate-stock-pick";

export type StockPickEditorValue = {
  ticker: string;
  note: string;
  video_asset_id: string;
};

export function stockPickEditorValueFromStored(
  stockPick: CreatorStockPickStored | null | undefined,
): StockPickEditorValue {
  return {
    ticker: stockPick?.ticker ?? "",
    note: stockPick?.note ?? "",
    video_asset_id: stockPick?.video_asset_id ?? "",
  };
}
