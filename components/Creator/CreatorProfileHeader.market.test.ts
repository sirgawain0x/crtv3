import { describe, expect, it } from 'vitest';
import type { MarketToken } from '@/app/api/market/tokens/route';
import { resolveMeTokenMarketStatsFromResponse } from '@/lib/hooks/market/marketStatsSelection';
import { filterMarketTokensBySearch } from '@/lib/market/tokenSearch';
import { formatUsdTokenPrice } from '@/lib/metokens/spotPrice';

const HOLY1_CONTRACT = '0x1a37f7d9589e427ac2b0114f3265c1bd0bc02e85';

/** Mirrors CreatorProfileHeader: useMeTokenMarketStats → price row label */
function creatorHeaderPriceLabel(
  meTokenContract: string,
  apiResponseTokens: MarketToken[]
): string | null {
  const searchable = filterMarketTokensBySearch(
    apiResponseTokens,
    meTokenContract
  );
  const stats = resolveMeTokenMarketStatsFromResponse(
    searchable,
    meTokenContract
  );
  if (stats?.price == null) {
    return null;
  }
  return formatUsdTokenPrice(stats.price);
}

describe('CreatorProfileHeader market price row', () => {
  it('shows non-zero HOLY1 price when stats load by MeToken contract address', () => {
    const tokens: MarketToken[] = [
      {
        id: 'holy1',
        address: HOLY1_CONTRACT,
        name: 'Denny',
        symbol: 'HOLY1',
        owner_address: '0x365e9d11f0431b434770c3e0bc34f01af315b0bf',
        type: 'metoken',
        price: 0.7071,
        tvl: 1,
        total_supply: '1414213562373095',
        market_cap: 1,
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ];

    const label = creatorHeaderPriceLabel(HOLY1_CONTRACT, tokens);
    expect(label).toBe('$0.7071');
  });
});
