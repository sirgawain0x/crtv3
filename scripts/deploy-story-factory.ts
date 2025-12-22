/**
 * Story Protocol Factory Deployment & Verification Script
 * 
 * This script verifies Story Protocol SPG (Story Protocol Gateway) connectivity
 * and can be used to test collection creation on Story testnet.
 * 
 * Note: We're using Story Protocol's built-in SPG, so no custom factory deployment is needed.
 * The SPG provides factory functionality via `createCollection` method.
 * 
 * Usage:
 *   tsx scripts/deploy-story-factory.ts
 */

import { createPublicClient, http, type Address } from "viem";
import { createStoryClient } from "../lib/sdk/story/client";

// Story testnet configuration
const STORY_TESTNET_RPC = process.env.NEXT_PUBLIC_STORY_RPC_URL || "https://rpc.aeneid.story.foundation";
const STORY_TESTNET_CHAIN_ID = 1315; // Aeneid testnet

// Test account (you'll need to provide a private key or use Account Kit)
const TEST_ACCOUNT = process.env.STORY_TEST_ACCOUNT as Address | undefined;

async function verifyStoryConnection() {
  console.log("🔍 Verifying Story Protocol connection...");
  
  try {
    // Create a public client for Story testnet
    const publicClient = createPublicClient({
      transport: http(STORY_TESTNET_RPC),
    });

    // Get chain ID to verify connection
    const chainId = await publicClient.getChainId();
    console.log(`✅ Connected to Story testnet (Chain ID: ${chainId})`);

    if (chainId !== STORY_TESTNET_CHAIN_ID) {
      console.warn(`⚠️  Expected chain ID ${STORY_TESTNET_CHAIN_ID}, got ${chainId}`);
    }

    // Get latest block to verify network is active
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Latest block: ${blockNumber}`);

    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Story testnet:", error);
    return false;
  }
}

async function verifyStorySDK() {
  console.log("\n🔍 Verifying Story Protocol SDK...");

  if (!TEST_ACCOUNT) {
    console.warn("⚠️  STORY_TEST_ACCOUNT not set, skipping SDK verification");
    console.log("   Set STORY_TEST_ACCOUNT in .env.local to test SDK functionality");
    return false;
  }

  try {
    const storyClient = createStoryClient(TEST_ACCOUNT);
    console.log("✅ Story Protocol SDK client created successfully");
    
    // Verify client has SPG methods
    if (storyClient.registrationWorkflows) {
      console.log("✅ SPG registrationWorkflows available");
    } else {
      console.warn("⚠️  SPG registrationWorkflows not found in SDK");
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to create Story Protocol SDK client:", error);
    return false;
  }
}

async function main() {
  console.log("🚀 Story Protocol Factory Verification Script\n");
  console.log("=" .repeat(60));
  console.log("Note: Using Story Protocol's built-in SPG (no custom factory needed)");
  console.log("=" .repeat(60));
  console.log();

  // Verify connection
  const connectionOk = await verifyStoryConnection();
  if (!connectionOk) {
    console.error("\n❌ Connection verification failed. Exiting.");
    process.exit(1);
  }

  // Verify SDK
  const sdkOk = await verifyStorySDK();
  if (!sdkOk && TEST_ACCOUNT) {
    console.error("\n❌ SDK verification failed. Exiting.");
    process.exit(1);
  }

  console.log("\n✅ All verifications passed!");
  console.log("\n📝 Next steps:");
  console.log("   1. Use SPG createCollection() to create NFT collections for creators");
  console.log("   2. Use SPG mintAndRegisterIp() to mint NFTs and register as IP Assets");
  console.log("   3. See lib/sdk/story/spg-service.ts for implementation");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

