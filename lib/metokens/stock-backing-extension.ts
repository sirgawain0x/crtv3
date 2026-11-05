/**
 * Future extension point: stock-backed MeToken hubs (disabled in PR1).
 *
 * Upstream HubFacet.register(owner, asset, vault, …) accepts any non-zero ERC-20;
 * SingleAssetVault.isValid returns true. Stock backing requires a NEW hub — never
 * mutate USDC/GHO hub 2 (CRTVAI) or other live hubs.
 *
 * @see scripts/metokens/register-erc20-hub-sepolia.ts (Sepolia-targeted, not executed)
 */

/** Explicitly blocked hub ids for stock-back experiments. */
export const STOCK_BACKING_FORBIDDEN_HUB_IDS = [2] as const;

export type StockBackingHubRegistrationIntent = {
  /** Target chain — PR1 scripts/docs use Base Sepolia (84532) only. */
  chainId: 84532;
  /** Collateral ERC-20 (e.g. 8-decimal o1 Base stock token). */
  asset: `0x${string}`;
  assetDecimals: number;
  vault: `0x${string}`;
  hubOwner: `0x${string}`;
};

/**
 * Disabled placeholder — no runtime behavior until counsel + G2 approve mainnet hubs.
 */
export type StockBackedMeTokenBackingAsset =
  | { kind: "stablecoin"; symbol: "USDC" | "USDS" | "GHO" | "DAI" }
  | {
      kind: "tokenized_stock";
      /** Must reference {@link O1BaseStockToken} catalog entry when enabled. */
      ticker: string;
      tokenAddress: `0x${string}`;
      decimals: number;
      /** When false, UI must not offer stock backing (PR1 default). */
      enabled: false;
    };

export const STOCK_BACKED_METOKEN_BACKING: StockBackedMeTokenBackingAsset = {
  kind: "tokenized_stock",
  ticker: "",
  tokenAddress: "0x0000000000000000000000000000000000000000",
  decimals: 8,
  enabled: false,
};
