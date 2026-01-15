declare module '@reality.eth/contracts' {
  interface RealityETHConfig {
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
    defaultTokenForChain(chainId: number): string;
  }

  const reality_eth_contracts: RealityETHContracts;
  export default reality_eth_contracts;
}
