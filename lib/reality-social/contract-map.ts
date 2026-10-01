import reality_eth_contracts from "@reality.eth/contracts";

export type ContractTokenMap = {
  contractTokens: Record<string, string>;
  tokenDecimals: Record<string, number>;
};

/** Maps Reality.eth contract addresses on a chain to their bond token tickers. */
export function buildContractTokenMap(chainId: number): ContractTokenMap {
  const tokens = reality_eth_contracts.chainTokenList(chainId);
  const contractTokens: Record<string, string> = {};
  const tokenDecimals: Record<string, number> = {};

  for (const ticker of Object.keys(tokens)) {
    const meta = tokens[ticker as keyof typeof tokens];
    if (meta && typeof meta === "object" && "decimals" in meta) {
      tokenDecimals[ticker] = Number((meta as { decimals: number }).decimals);
    }
    const configs = reality_eth_contracts.realityETHConfigs(chainId, ticker);
    for (const address of Object.keys(configs)) {
      contractTokens[address.toLowerCase()] = ticker;
    }
  }

  return { contractTokens, tokenDecimals };
}
