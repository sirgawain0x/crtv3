/**
 * Story Protocol SDK Client Setup
 * Initializes the Story Protocol client for IP Asset registration
 * 
 * Note: Story Protocol SDK bundles its own viem version, so we need to use
 * type assertions to work around version incompatibilities.
 */

import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";
import { http } from "viem";
import type { Address } from "viem";

/**
 * Create a Story Protocol client instance
 * This client is used for IP Asset registration and management
 */
export function createStoryClient(
  accountAddress: Address,
  privateKey?: string
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
    transport: http(rpcUrl) as any, // Type assertion needed due to viem version mismatch
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

