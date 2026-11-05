import { baseSepolia } from "@/lib/utils/chains/base";

/**
 * Runtime catalog for Creator Stock Picks — Base Sepolia only.
 *
 * BLOCKER: o1 publishes Base **mainnet** stock quotes at
 * https://docs.o1.exchange/launchpad/reference/base-stock-quotes.json (chainId 8453).
 * No official Base Sepolia stock catalog was found (404 for base-sepolia-stock-quotes.json;
 * GET https://api.o1.exchange/api/v1/alpha-tokens?networkId=84532 returns []).
 *
 * Fail closed: do not map mainnet token addresses onto Sepolia.
 */
export type O1SepoliaStockToken = {
  ticker: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  chainId: typeof baseSepolia.id;
  /** Official o1 documentation URL proving this row. */
  evidenceUrl: string;
};

/** Empty until o1 documents Base Sepolia stock token deployments. */
export const O1_BASE_SEPOLIA_STOCK_CATALOG: readonly O1SepoliaStockToken[] = [];
