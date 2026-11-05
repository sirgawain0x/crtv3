/**
 * Official o1 Base **mainnet** stock quote metadata — REFERENCE / PR evidence only.
 * Not used for Creative TV runtime (Sepolia catalog required). See SPIKE-NOTES.md.
 */
export const O1_OFFICIAL_BASE_MAINNET_STOCK_QUOTES_SOURCE =
  "https://docs.o1.exchange/launchpad/reference/base-stock-quotes.json" as const;

export const O1_OFFICIAL_BASE_MAINNET_STOCK_DOCS =
  "https://docs.o1.exchange/launchpad/create/stock-paired-launches#base-stock-token-catalog" as const;

export const O1_OFFICIAL_ALPHA_TOKENS_API =
  "https://docs.o1.exchange/api/alpha-tokens" as const;

/** Snapshot fields from base-stock-quotes.json (fetched 2026-11-05). */
export const O1_OFFICIAL_BASE_MAINNET_CATALOG_META = {
  chainId: 8453,
  chain: "Base Mainnet",
  quoteDecimals: 8,
  lastCatalogVerifiedBlock: 53_519_217,
  sourceUrl: O1_OFFICIAL_BASE_MAINNET_STOCK_QUOTES_SOURCE,
} as const;

/** Example rows from official JSON — not Sepolia; do not import into runtime catalog. */
export const O1_OFFICIAL_BASE_MAINNET_SAMPLE_QUOTES = [
  {
    symbol: "AMC",
    name: "AMC Entertainment Holdings, Inc.",
    address: "0xB200000000000000000000CD7e6b8042cb7c2BB5",
    decimals: 8,
    evidenceUrl: O1_OFFICIAL_BASE_MAINNET_STOCK_QUOTES_SOURCE,
  },
  {
    symbol: "ARM",
    name: "Arm Holdings plc",
    address: "0xB20000000000000000000026215D755356E5043f",
    decimals: 8,
    evidenceUrl: O1_OFFICIAL_BASE_MAINNET_STOCK_QUOTES_SOURCE,
  },
  {
    symbol: "AVGO",
    name: "Broadcom Inc.",
    address: "0xB200000000000000000000Fc737aeA6196aB5a4c",
    decimals: 8,
    evidenceUrl: O1_OFFICIAL_BASE_MAINNET_STOCK_QUOTES_SOURCE,
  },
  {
    symbol: "BAC",
    name: "Bank of America Corporation",
    address: "0xB200000000000000000000E3e784CDF88Df2959d",
    decimals: 8,
    evidenceUrl: O1_OFFICIAL_BASE_MAINNET_STOCK_QUOTES_SOURCE,
  },
] as const;
