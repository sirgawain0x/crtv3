import { describe, expect, it } from 'vitest';
import type { MarketToken } from '@/app/api/market/tokens/route';
import {
  filterMarketTokensBySearch,
  marketTokenMatchesSearch,
  selectMarketTokenByContractAddress,
} from './tokenSearch';

const HOLY1_CONTRACT = '0x1a37f7d9589e427ac2b0114f3265c1bd0bc02e85';
const HOLY1_OWNER = '0x365e9d11f0431b434770c3e0bc34f01af315b0bf';

function holy1MarketToken(): MarketToken {
  return {
    id: 'holy1',
    address: HOLY1_CONTRACT,
    name: 'Denny',
    symbol: 'HOLY1',
    owner_address: HOLY1_OWNER,
    type: 'metoken',
    price: 0.7071,
    tvl: 1,
    total_supply: '1414213562373095',
    market_cap: 1,
    created_at: '2024-01-01T00:00:00.000Z',
  };
}

describe('marketTokenMatchesSearch', () => {
  it('matches MeToken contract address (case-insensitive)', () => {
    const token = holy1MarketToken();
    expect(marketTokenMatchesSearch(token, HOLY1_CONTRACT)).toBe(true);
    expect(
      marketTokenMatchesSearch(token, HOLY1_CONTRACT.toUpperCase())
    ).toBe(true);
    expect(marketTokenMatchesSearch(token, 'HOLY1')).toBe(true);
    expect(marketTokenMatchesSearch(token, HOLY1_OWNER)).toBe(true);
  });

  it('does not match unrelated contract searches', () => {
    const token = holy1MarketToken();
    expect(
      marketTokenMatchesSearch(token, '0x0000000000000000000000000000000000000001')
    ).toBe(false);
  });
});

describe('filterMarketTokensBySearch', () => {
  it('returns HOLY1 when searching by MeToken contract address', () => {
    const tokens = [holy1MarketToken()];
    const filtered = filterMarketTokensBySearch(tokens, HOLY1_CONTRACT);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].price).toBeCloseTo(0.7071, 4);
  });
});

describe('selectMarketTokenByContractAddress', () => {
  it('selects token by contract for stats hooks', () => {
    const selected = selectMarketTokenByContractAddress(
      [holy1MarketToken()],
      HOLY1_CONTRACT
    );
    expect(selected?.symbol).toBe('HOLY1');
    expect(selected?.price).toBeCloseTo(0.7071, 4);
  });
});
