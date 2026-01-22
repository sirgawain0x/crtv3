import { getContract } from "viem";
import { base } from "@account-kit/infra";
import type { Address, PublicClient } from "viem";
import reality_eth_contracts from "@reality.eth/contracts";
import localABI from "./reality-eth-abi.json";

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

  // Log config structure for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log("🔍 Reality.eth config structure:", {
      hasAbi: 'abi' in config,
      abiType: typeof (config as any).abi,
      abiIsArray: Array.isArray((config as any).abi),
      abiLength: Array.isArray((config as any).abi) ? (config as any).abi.length : 'N/A',
      configKeys: Object.keys(config),
      hasInstanceMethod: !!(reality_eth_contracts as any).realityETHInstance,
    });
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
  
  // Method 1: Try to get ABI from config first (if available)
  if (config.abi && Array.isArray(config.abi) && config.abi.length > 0) {
    console.log("✅ Got ABI from config.abi");
    return config.abi;
  }
  
  // Method 2: Try using realityETHInstance (recommended method)
  if ((reality_eth_contracts as any).realityETHInstance) {
    try {
      const instance = (reality_eth_contracts as any).realityETHInstance(config);
      if (instance && instance.abi && Array.isArray(instance.abi) && instance.abi.length > 0) {
        console.log("✅ Got ABI from realityETHInstance");
        return instance.abi;
      }
    } catch (error) {
      console.warn("⚠️ Failed to get ABI from realityETHInstance:", error);
    }
  }
  
  // Method 3: Use local ABI file as fallback (most reliable)
  if (localABI && Array.isArray(localABI) && localABI.length > 0) {
    console.log("✅ Using local ABI file as fallback");
    return localABI as any[];
  }
  
  // If all methods fail, throw an error with helpful information
  const errorDetails = {
    hasConfigAbi: !!config.abi,
    configAbiType: typeof config.abi,
    configAbiIsArray: Array.isArray(config.abi),
    configAbiLength: Array.isArray(config.abi) ? config.abi.length : 'N/A',
    hasInstanceMethod: !!(reality_eth_contracts as any).realityETHInstance,
    configKeys: Object.keys(config),
  };
  
  console.error("❌ Failed to get ABI using all methods:", errorDetails);
  throw new Error(
    `Reality.eth ABI is not available. Tried: config.abi, realityETHInstance, and file loading. ` +
    `Details: ${JSON.stringify(errorDetails)}`
  );
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
