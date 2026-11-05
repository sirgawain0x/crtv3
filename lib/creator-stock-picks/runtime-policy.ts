import { baseSepolia } from "@/lib/utils/chains/base";
import { O1_BASE_SEPOLIA_STOCK_CATALOG } from "@/lib/creator-stock-picks/sepolia-stock-catalog";

/** Hard-coded target chain for Creator Stock Picks (not caller-supplied). */
export const CREATOR_STOCK_PICKS_TARGET_CHAIN_ID = baseSepolia.id;

export type CreatorStockPicksBlocker =
  | "feature_flag_off"
  | "production_deployment"
  | "no_verified_sepolia_catalog";

export function isCreatorStockPicksFeatureFlagOn(): boolean {
  return (
    process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED?.toLowerCase() ===
    "true"
  );
}

/** Trustworthy deployment signal (Vercel); local dev has no VERCEL_ENV. */
export function isCreatorStockPicksNonProductionDeployment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === undefined || vercelEnv === "") {
    return true;
  }
  return vercelEnv !== "production";
}

export function getCreatorStockPicksActiveCatalog() {
  return O1_BASE_SEPOLIA_STOCK_CATALOG;
}

export function getCreatorStockPicksBlocker(): CreatorStockPicksBlocker | null {
  if (!isCreatorStockPicksFeatureFlagOn()) {
    return "feature_flag_off";
  }
  if (!isCreatorStockPicksNonProductionDeployment()) {
    return "production_deployment";
  }
  if (getCreatorStockPicksActiveCatalog().length === 0) {
    return "no_verified_sepolia_catalog";
  }
  return null;
}

/** When true, server may accept stock_pick writes and public UI may render pins. */
export function isCreatorStockPicksRuntimeEnabled(): boolean {
  return getCreatorStockPicksBlocker() === null;
}

export function shouldRenderCreatorStockPick(
  stockPick: unknown,
): stockPick is NonNullable<typeof stockPick> {
  if (!isCreatorStockPicksRuntimeEnabled()) {
    return false;
  }
  return stockPick !== null && stockPick !== undefined;
}
