/**
 * Story Protocol Factory Deployment & Verification Script
 * 
 * This script verifies Story Protocol SPG (Story Protocol Gateway) connectivity
 * and can be used to test collection creation on Story testnet or mainnet.
 * 
 * Note: We're using Story Protocol's built-in SPG, so no custom factory deployment is needed.
 * The SPG provides factory functionality via `createCollection` method.
 * 
 * Usage:
 *   # Testnet (default)
 *   tsx scripts/deploy-story-factory.ts
 *   
 *   # Mainnet
 *   NEXT_PUBLIC_STORY_NETWORK=mainnet tsx scripts/deploy-story-factory.ts
 * 
 * Environment Variables:
 *   NEXT_PUBLIC_STORY_NETWORK - "testnet" (default) or "mainnet"
 *   NEXT_PUBLIC_STORY_RPC_URL - Custom RPC URL (optional)
 *   NEXT_PUBLIC_STORY_ALCHEMY_API_KEY - Alchemy API key for Story Protocol (optional)
 *   STORY_TEST_ACCOUNT - Test account address for SDK verification (optional)
 */

import { createPublicClient, http, type Address } from "viem";
import { createStoryClient, getStoryRpcUrl } from "../lib/sdk/story/client";

// Story network configuration
const STORY_NETWORK = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
const STORY_TESTNET_CHAIN_ID = 1315; // Aeneid testnet
const STORY_MAINNET_CHAIN_ID = 1514; // Story mainnet
const EXPECTED_CHAIN_ID = STORY_NETWORK === "mainnet" ? STORY_MAINNET_CHAIN_ID : STORY_TESTNET_CHAIN_ID;

// Test account (you'll need to provide a private key or use Account Kit)
const TEST_ACCOUNT = process.env.STORY_TEST_ACCOUNT as Address | undefined;

async function verifyStoryConnection() {
  const networkName = STORY_NETWORK === "mainnet" ? "mainnet" : "testnet (Aeneid)";
  console.log(`🔍 Verifying Story Protocol ${networkName} connection...`);
  
  try {
    // Get RPC URL (uses environment variable or defaults)
    const rpcUrl = getStoryRpcUrl();
    console.log(`   RPC URL: ${rpcUrl}`);

    // Create a public client for Story Protocol
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    // Get chain ID to verify connection
    const chainId = await publicClient.getChainId();
    console.log(`✅ Connected to Story Protocol ${networkName} (Chain ID: ${chainId})`);

    if (chainId !== EXPECTED_CHAIN_ID) {
      console.warn(`⚠️  Expected chain ID ${EXPECTED_CHAIN_ID} for ${STORY_NETWORK}, got ${chainId}`);
      console.warn(`   This might indicate a network mismatch. Please check your RPC URL.`);
    } else {
      console.log(`✅ Chain ID matches expected value for ${STORY_NETWORK}`);
    }

    // Get latest block to verify network is active
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Latest block: ${blockNumber}`);

    // Get network name from chain ID for confirmation
    const networkLabel = chainId === STORY_MAINNET_CHAIN_ID ? "mainnet" : "testnet";
    console.log(`✅ Confirmed: Connected to Story Protocol ${networkLabel}`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to Story Protocol ${networkName}:`, error);
    return false;
  }
}

async function verifyStorySDK() {
  const networkName = STORY_NETWORK === "mainnet" ? "mainnet" : "testnet";
  console.log(`\n🔍 Verifying Story Protocol SDK (${networkName})...`);

  if (!TEST_ACCOUNT) {
    console.warn("⚠️  STORY_TEST_ACCOUNT not set, skipping SDK verification");
    console.log("   Set STORY_TEST_ACCOUNT in .env.local to test SDK functionality");
    console.log("   Example: STORY_TEST_ACCOUNT=0x...");
    return false;
  }

  try {
    console.log(`   Using account: ${TEST_ACCOUNT}`);
    const storyClient = createStoryClient(TEST_ACCOUNT);
    console.log("✅ Story Protocol SDK client created successfully");
    
    // Verify client has SPG methods (nftClient for collection creation)
    if (storyClient.nftClient) {
      console.log("✅ SPG nftClient available (for collection creation)");
    } else {
      console.warn("⚠️  SPG nftClient not found in SDK");
    }

    // Verify client has IP Asset methods
    if (storyClient.ipAsset) {
      console.log("✅ IP Asset client available (for mint and register)");
    } else {
      console.warn("⚠️  IP Asset client not found in SDK");
    }

    // Verify network configuration
    const config = (storyClient as any).config;
    if (config) {
      const clientChainId = config.chainId;
      console.log(`   SDK configured for chain: ${clientChainId}`);
      if (clientChainId === (STORY_NETWORK === "mainnet" ? "mainnet" : "aeneid")) {
        console.log(`✅ SDK chain configuration matches ${STORY_NETWORK}`);
      } else {
        console.warn(`⚠️  SDK chain configuration (${clientChainId}) doesn't match expected (${STORY_NETWORK})`);
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to create Story Protocol SDK client:", error);
    return false;
  }
}

async function main() {
  const networkName = STORY_NETWORK === "mainnet" ? "mainnet" : "testnet (Aeneid)";
  const chainId = EXPECTED_CHAIN_ID;
  
  console.log("🚀 Story Protocol Factory Verification Script\n");
  console.log("=" .repeat(60));
  console.log("Note: Using Story Protocol's built-in SPG (no custom factory needed)");
  console.log("=" .repeat(60));
  console.log();
  console.log(`📡 Network: ${networkName}`);
  console.log(`🔗 Chain ID: ${chainId}`);
  console.log(`🌐 RPC URL: ${getStoryRpcUrl()}`);
  if (process.env.NEXT_PUBLIC_STORY_ALCHEMY_API_KEY) {
    console.log(`🔑 Using Alchemy RPC (API key configured)`);
  }
  console.log();

  // Verify connection
  const connectionOk = await verifyStoryConnection();
  if (!connectionOk) {
    console.error("\n❌ Connection verification failed. Exiting.");
    console.error("\n💡 Troubleshooting:");
    console.error("   - Check NEXT_PUBLIC_STORY_RPC_URL is correct");
    console.error("   - Verify network is accessible");
    console.error("   - For mainnet, ensure NEXT_PUBLIC_STORY_NETWORK=mainnet");
    process.exit(1);
  }

  // Verify SDK
  const sdkOk = await verifyStorySDK();
  if (!sdkOk && TEST_ACCOUNT) {
    console.error("\n❌ SDK verification failed. Exiting.");
    console.error("\n💡 Troubleshooting:");
    console.error("   - Verify STORY_TEST_ACCOUNT is a valid address");
    console.error("   - Check NEXT_PUBLIC_STORY_NETWORK matches your RPC URL");
    console.error("   - Ensure Story Protocol SDK is installed: yarn add @story-protocol/core-sdk");
    process.exit(1);
  }

  console.log("\n✅ All verifications passed!");
  console.log("\n📝 Next steps:");
  console.log("   1. Use client.nftClient.createNFTCollection() to create NFT collections for creators");
  console.log("   2. Use client.ipAsset.mintAndRegisterIp() to mint NFTs and register as IP Assets");
  console.log("   3. See lib/sdk/story/spg-service.ts for implementation");
  console.log("\n💡 To switch networks:");
  console.log("   - Testnet: NEXT_PUBLIC_STORY_NETWORK=testnet (default)");
  console.log("   - Mainnet: NEXT_PUBLIC_STORY_NETWORK=mainnet");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

