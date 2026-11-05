/**
 * Read-only o1 Exchange Base Stock Token catalog (Path B PR1).
 *
 * Addresses verified from the ENTER research packet (2026-11-05), which cites
 * docs.o1.exchange Base Stock Tokens @ block 53,519,217, plus user-confirmed AMC.
 * o1 public docs sitemap (Nov 2026) has no dedicated token registry page; do not
 * add tickers here without a full checksummed address from primary docs/on-chain.
 */
export type O1BaseStockToken = {
  ticker: string;
  name: string;
  /** Base mainnet ERC-20 (8 decimals per o1 stock tokens). */
  address: `0x${string}`;
  decimals: 8;
  /** Source note for auditors / PR reviewers. */
  addressSource: string;
};

export const O1_BASE_STOCK_TOKENS: readonly O1BaseStockToken[] = [
  {
    ticker: "AMC",
    name: "AMC Entertainment",
    address: "0xB200000000000000000000CD7e6b8042cb7c2BB5",
    decimals: 8,
    addressSource:
      "User-confirmed + ENTER packet (docs.o1.exchange Base Stock Tokens, Nov 2026)",
  },
  {
    ticker: "ARM",
    name: "Arm Holdings",
    address: "0xB20000000000000000000026215D755356E5043f",
    decimals: 8,
    addressSource:
      "ENTER packet (docs.o1.exchange Base Stock Tokens, Nov 2026)",
  },
  {
    ticker: "AVGO",
    name: "Broadcom",
    address: "0xB200000000000000000000Fc737aeA6196aB5a4c",
    decimals: 8,
    addressSource:
      "ENTER packet (docs.o1.exchange Base Stock Tokens, Nov 2026)",
  },
  {
    ticker: "BAC",
    name: "Bank of America",
    address: "0xB200000000000000000000E3e784CDF88Df2959d",
    decimals: 8,
    addressSource:
      "ENTER packet (docs.o1.exchange Base Stock Tokens, Nov 2026)",
  },
] as const;

const byTicker = new Map(
  O1_BASE_STOCK_TOKENS.map((t) => [t.ticker.toUpperCase(), t]),
);
const byAddress = new Map(
  O1_BASE_STOCK_TOKENS.map((t) => [t.address.toLowerCase(), t]),
);

export function getO1BaseStockTokenByTicker(
  ticker: string,
): O1BaseStockToken | undefined {
  return byTicker.get(ticker.trim().toUpperCase());
}

export function getO1BaseStockTokenByAddress(
  address: string,
): O1BaseStockToken | undefined {
  return byAddress.get(address.trim().toLowerCase());
}

/** o1 Terminal deep-link (Base mainnet output token). Trading stays on partner; no custody here. */
export function buildO1PartnerDeepLink(token: O1BaseStockToken): string {
  const params = new URLSearchParams({
    chainId: "8453",
    inputCurrency: token.address,
  });
  return `https://o1.exchange/swap?${params.toString()}`;
}
