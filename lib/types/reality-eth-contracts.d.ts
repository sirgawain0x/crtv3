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

  interface RealityETHContracts {
    isChainSupported(chainId: number): boolean;
    realityETHConfig(
      chainId: number,
      tokenTicker: string,
      version: string
    ): RealityETHConfig | null;
    realityETHInstance?(config: RealityETHConfig): RealityETHInstance;
    defaultTokenForChain(chainId: number): string;
  }

  const reality_eth_contracts: RealityETHContracts;
  export default reality_eth_contracts;
}
