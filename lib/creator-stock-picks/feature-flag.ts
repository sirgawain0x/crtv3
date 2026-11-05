import {
  getCreatorStockPicksBlocker,
  isCreatorStockPicksRuntimeEnabled,
  shouldRenderCreatorStockPick,
} from "@/lib/creator-stock-picks/runtime-policy";

/** @deprecated Use isCreatorStockPicksRuntimeEnabled / getCreatorStockPicksBlocker */
export function isCreatorStockPicksFeatureEnabled(): boolean {
  return isCreatorStockPicksRuntimeEnabled();
}

export {
  getCreatorStockPicksBlocker,
  isCreatorStockPicksRuntimeEnabled,
  shouldRenderCreatorStockPick,
};
