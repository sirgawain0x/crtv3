import type { MarketToken } from '@/app/api/market/tokens/route';
import { selectMarketTokenByContractAddress } from '@/lib/market/tokenSearch';

/** Resolve stats for a MeToken contract (creator header / dialogs). */
export function resolveMeTokenMarketStatsFromResponse(
  tokens: MarketToken[] | undefined,
  meTokenContractAddress: string
): MarketToken | null {
  return selectMarketTokenByContractAddress(tokens, meTokenContractAddress);
}
