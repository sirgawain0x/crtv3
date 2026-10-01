declare module '@reality.eth/contracts' {
  interface RealityETHConfig {
    address: string;
    abi?: any[];
    chainId: number;
    version: string;
    tokenTicker: string;
  }

  interface RealityETHInstance {
    address: string;
    abi: any[];
    chainId: number;
    version: string;
    tokenTicker: string;
  }

  interface ChainTokenMeta {
    decimals: number;
  }

  interface RealityETHContracts {
    isChainSupported(chainId: number): boolean;
    realityETHConfig(
      chainId: number,
      tokenTicker: string,
      version: string
    ): RealityETHConfig | null;
    realityETHConfigs(
      chainId: number,
      tokenTicker: string
    ): Record<string, RealityETHConfig>;
    realityETHInstance?(config: RealityETHConfig): RealityETHInstance;
    defaultTokenForChain(chainId: number): string;
    chainTokenList(chainId: number): Record<string, ChainTokenMeta>;
    chainData(chainId: number): { graphURL?: string };
  }

  const reality_eth_contracts: RealityETHContracts;
  export default reality_eth_contracts;
}
