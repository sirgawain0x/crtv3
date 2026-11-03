export interface LiveMeTokenMarket {
  totalSupplyWei: bigint;
  tvl: number;
  price: number;
  hubId: number;
}

export const LIVE_ME_TOKEN_MARKET_CACHE_TTL_MS = 45_000;

interface CacheEntry {
  value: LiveMeTokenMarket;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedLiveMeTokenMarket(
  address: string,
  nowMs: number = Date.now()
): LiveMeTokenMarket | undefined {
  const key = address.toLowerCase();
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= nowMs) {
    return undefined;
  }
  return entry.value;
}

export function setCachedLiveMeTokenMarket(
  address: string,
  value: LiveMeTokenMarket,
  nowMs: number = Date.now()
): void {
  cache.set(address.toLowerCase(), {
    value,
    expiresAt: nowMs + LIVE_ME_TOKEN_MARKET_CACHE_TTL_MS,
  });
}

export function clearLiveMeTokenMarketCache(): void {
  cache.clear();
}
