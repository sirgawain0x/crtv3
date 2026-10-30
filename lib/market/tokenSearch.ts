import type { MarketToken } from '@/app/api/market/tokens/route';

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isEthereumAddress(value: string): boolean {
  return ETH_ADDRESS_RE.test(value.trim());
}

/** In-memory filter for market token lists (post-fetch). */
export function marketTokenMatchesSearch(
  token: MarketToken,
  search: string
): boolean {
  const trimmed = search.trim();
  if (!trimmed) {
    return true;
  }

  const searchLower = trimmed.toLowerCase();

  if (isEthereumAddress(trimmed)) {
    return (
      token.address.toLowerCase() === searchLower ||
      token.owner_address.toLowerCase() === searchLower
    );
  }

  return (
    token.name.toLowerCase().includes(searchLower) ||
    token.symbol.toLowerCase().includes(searchLower) ||
    token.owner_address.toLowerCase().includes(searchLower) ||
    token.address.toLowerCase().includes(searchLower) ||
    Boolean(token.video_title?.toLowerCase().includes(searchLower))
  );
}

export function filterMarketTokensBySearch(
  tokens: MarketToken[],
  search: string
): MarketToken[] {
  if (!search.trim()) {
    return tokens;
  }
  return tokens.filter((token) => marketTokenMatchesSearch(token, search));
}

/** Used by useMeTokenMarketStats / creator header after /api/market/tokens search. */
export function selectMarketTokenByContractAddress(
  tokens: MarketToken[] | undefined,
  contractAddress: string
): MarketToken | null {
  if (!tokens?.length) {
    return null;
  }
  const normalized = contractAddress.toLowerCase();
  return (
    tokens.find((t) => t.address.toLowerCase() === normalized) ?? null
  );
}
