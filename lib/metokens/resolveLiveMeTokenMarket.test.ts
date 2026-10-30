import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLiveMeTokenMarketCache,
  LIVE_ME_TOKEN_MARKET_CACHE_TTL_MS,
} from '@/lib/metokens/liveMeTokenMarketCache';
import {
  __resetLiveMeTokenMarketFetcherForTests,
  __setLiveMeTokenMarketFetcherForTests,
  resolveLiveMeTokenMarket,
} from '@/lib/metokens/resolveLiveMeTokenMarket';

const TOKEN = '0xecb695544a3d2a64d579b3828f3f60f6932f4846';

const sampleMarket = {
  totalSupplyWei: 3199997731857693174n,
  tvl: 9.12,
  price: 2.85,
  hubId: 2,
};

describe('resolveLiveMeTokenMarket cache', () => {
  const fetchMock = vi.fn(async () => sampleMarket);

  beforeEach(() => {
    clearLiveMeTokenMarketCache();
    fetchMock.mockClear();
    __setLiveMeTokenMarketFetcherForTests(fetchMock);
  });

  afterEach(() => {
    clearLiveMeTokenMarketCache();
    __resetLiveMeTokenMarketFetcherForTests();
  });

  it('returns cached value within TTL without a second RPC fetch', async () => {
    const t0 = 1_700_000_000_000;
    const first = await resolveLiveMeTokenMarket(TOKEN, 2, t0);
    const second = await resolveLiveMeTokenMarket(
      TOKEN,
      2,
      t0 + LIVE_ME_TOKEN_MARKET_CACHE_TTL_MS - 1_000
    );

    expect(first).toEqual(sampleMarket);
    expect(second).toEqual(sampleMarket);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches after TTL expires', async () => {
    const t0 = 1_700_000_000_000;
    await resolveLiveMeTokenMarket(TOKEN, 2, t0);
    await resolveLiveMeTokenMarket(
      TOKEN,
      2,
      t0 + LIVE_ME_TOKEN_MARKET_CACHE_TTL_MS + 1
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
