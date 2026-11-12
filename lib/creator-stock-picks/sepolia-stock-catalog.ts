import { baseSepolia } from "@/lib/utils/chains/base";

/**
 * Runtime catalog for Creator Stock Picks — Base Sepolia only.
 *
 * BLOCKER: Runtime catalog stays **empty** until a verified Base Sepolia stock list exists.
 * o1 mainnet quotes (chainId 8453) are reference-only — never mapped onto Sepolia.
 * Prior probes: o1 Sepolia quotes 404; alpha-tokens on 84532 returned [].
 * **CTO-supplied finding (not independently verified here):** Coinbase
 * `/v1/tokenized-stocks/chains` lists **only** Base mainnet (8453); sampled stock
 * addresses have no contract code on Sepolia. Do not pursue a Sepolia catalog as if available.
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
