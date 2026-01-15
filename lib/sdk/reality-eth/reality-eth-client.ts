import { getContract } from "viem";
import { base } from "@account-kit/infra";
import type { Address, PublicClient } from "viem";
import reality_eth_contracts from "@reality.eth/contracts";

/**
 * Reality.eth Client
 * 
 * Provides contract interaction utilities for Reality.eth questions and answers.
 * Uses Base network (chain ID 8453) by default.
 */

const CHAIN_ID = 8453; // Base
const TOKEN_TICKER = "ETH"; // Native token for Base
const VERSION = "3.0"; // Reality.eth v3

/**
 * Get Reality.eth contract configuration for Base network
 */
export function getRealityEthConfig() {
  const isSupported = reality_eth_contracts.isChainSupported(CHAIN_ID);
  
  if (!isSupported) {
    throw new Error(`Reality.eth is not supported on chain ${CHAIN_ID}`);
  }

  const config = reality_eth_contracts.realityETHConfig(CHAIN_ID, TOKEN_TICKER, VERSION);
  
  if (!config) {
    throw new Error(`Reality.eth ${VERSION} contract not found for chain ${CHAIN_ID}`);
  }

  return config;
}

/**
 * Get Reality.eth contract address for Base network
 */
export function getRealityEthContractAddress(): Address {
  const config = getRealityEthConfig();
  return config.address as Address;
}

/**
 * Get Reality.eth contract ABI
 */
export function getRealityEthABI(): any[] {
  const config = getRealityEthConfig();
  return config.abi as any[];
}

/**
 * Get Reality.eth contract instance
 */
export function getRealityEthContract(publicClient: PublicClient) {
  const address = getRealityEthContractAddress();
  const abi = getRealityEthABI();
  
  return getContract({
    address,
    abi,
    client: publicClient,
  });
}

/**
 * Get default token ticker for chain
 */
export function getDefaultTokenTicker(): string {
  return reality_eth_contracts.defaultTokenForChain(CHAIN_ID);
}
