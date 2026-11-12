import {
  O1_BASE_SEPOLIA_STOCK_CATALOG,
  type O1SepoliaStockToken,
} from "@/lib/creator-stock-picks/sepolia-stock-catalog";

export type { O1SepoliaStockToken as CreatorStockPickCatalogToken };

const byTicker = new Map(
  O1_BASE_SEPOLIA_STOCK_CATALOG.map((t) => [t.ticker.toUpperCase(), t]),
);
const byAddress = new Map(
  O1_BASE_SEPOLIA_STOCK_CATALOG.map((t) => [t.address.toLowerCase(), t]),
);

export function getStockPickTokenByTicker(
  ticker: string,
): O1SepoliaStockToken | undefined {
  return byTicker.get(ticker.trim().toUpperCase());
}

export function getStockPickTokenByAddress(
  address: string,
): O1SepoliaStockToken | undefined {
  return byAddress.get(address.trim().toLowerCase());
}

/** Partner deep-link; chainId comes from catalog entry (Sepolia when populated). */
export function buildStockPickPartnerDeepLink(
  token: O1SepoliaStockToken,
): string {
  const params = new URLSearchParams({
    chainId: String(token.chainId),
    inputCurrency: token.address,
  });
  return `https://o1.exchange/swap?${params.toString()}`;
}
