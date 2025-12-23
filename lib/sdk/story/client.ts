/**
 * Story Protocol SDK Client Setup
 * Initializes the Story Protocol client for IP Asset registration
 * 
 * Note: Story Protocol SDK bundles its own viem version, so we need to use
 * type assertions to work around version incompatibilities.
 */

import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";
import { http, createPublicClient, createWalletClient } from "viem";
import { alchemy, base } from "@account-kit/infra";
import type { Address } from "viem";

/**
 * Create a Story Protocol client instance
 * This client is used for IP Asset registration and management
 */
export function createStoryClient(
  accountAddress: Address,
  privateKey?: string,
  transport?: any // Optional transport override (e.g., for client-side signing)
): StoryClient {
  const rpcUrl = process.env.NEXT_PUBLIC_STORY_RPC_URL || "https://rpc.aeneid.story.foundation";
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";

  // Story Protocol client configuration
  // Use "aeneid" for testnet (chain ID 1315) or "mainnet" for mainnet (chain ID 1514)
  // Use type assertion to work around viem version incompatibility between
  // our project's viem and Story Protocol SDK's bundled viem
  const config: StoryConfig = {
    account: accountAddress,
    chainId: network === "testnet" ? "aeneid" : "mainnet",
    transport: transport || (http(rpcUrl) as any), // Use provided transport or default to HTTP
    // If privateKey is provided, use it for signing (server-side operations)
    // Otherwise, rely on Account Kit's signer (client-side operations)
    ...(privateKey && { privateKey }),
  };

  try {
    const client = StoryClient.newClient(config);
    return client;
  } catch (error) {
    console.error("Failed to create Story Protocol client:", error);
    throw new Error(
      `Story Protocol client initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create a Story Protocol client for client-side operations
 * Uses Account Kit's wallet connection
 */
export function createStoryClientWithAccount(accountAddress: Address): StoryClient {
  return createStoryClient(accountAddress);
}

/**
 * Get the Story Protocol RPC URL
 */
export function getStoryRpcUrl(): string {
  return process.env.NEXT_PUBLIC_STORY_RPC_URL || "https://rpc.aeneid.story.foundation";
}

/**
 * Create a public client for Base chain
 * Used for reading blockchain data on Base
 */
export function createBasePublicClient() {
  return createPublicClient({
    chain: base,
    transport: alchemy({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
    }),
  });
}

/**
 * Create a public client for Story testnet
 * Used for reading blockchain data on Story Protocol
 */
export function createStoryPublicClient() {
  const rpcUrl = getStoryRpcUrl();
  return createPublicClient({
    transport: http(rpcUrl),
  });
}

/**
 * Create a wallet client for Base chain
 * Used for writing transactions on Base
 */
export function createBaseWalletClient(account: Address) {
  return createWalletClient({
    chain: base,
    transport: alchemy({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
    }),
    account: account as any, // Type assertion for viem compatibility
  });
}

/**
 * Create a wallet client for Story Protocol (testnet or mainnet)
 * Used for writing transactions on Story Protocol
 */
export function createStoryWalletClient(account: Address) {
  const rpcUrl = getStoryRpcUrl();
  const storyAlchemyKey = process.env.NEXT_PUBLIC_STORY_ALCHEMY_API_KEY;
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";

  // Use Alchemy RPC if available, otherwise use public RPC
  // Determine the correct Alchemy endpoint based on network
  let transport;
  if (storyAlchemyKey) {
    if (network === "mainnet") {
      // Story mainnet Alchemy endpoint (when available)
      transport = http(`https://story-mainnet.g.alchemy.com/v2/${storyAlchemyKey}`);
    } else {
      // Story testnet Alchemy endpoint
      transport = http(`https://story-testnet.g.alchemy.com/v2/${storyAlchemyKey}`);
    }
  } else {
    // Use public RPC (already configured for correct network via getStoryRpcUrl)
    transport = http(rpcUrl);
  }

  return createWalletClient({
    transport,
    account: account as any, // Type assertion for viem compatibility
  });
}

