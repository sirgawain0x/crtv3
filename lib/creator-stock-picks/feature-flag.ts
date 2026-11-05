import { baseSepolia } from "@/lib/utils/chains/base";

/** Base Sepolia only; default off. No mainnet enable in PR1. */
export function isCreatorStockPicksFeatureEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED?.toLowerCase() ===
    "true"
  );
}

export function isCreatorStockPicksChainAllowed(chainId: number | undefined): boolean {
  if (!isCreatorStockPicksFeatureEnabled()) {
    return false;
  }
  return chainId === baseSepolia.id;
}
