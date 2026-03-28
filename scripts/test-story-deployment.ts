/**
 * Test Story Protocol Deployment and Collection Creation
 * 
 * This script tests the Story Protocol integration:
 * 1. Verifies connection to Story testnet
 * 2. Tests collection creation via SPG
 * 3. Tests mint-and-register functionality
 * 
 * Usage:
 *   tsx scripts/test-story-deployment.ts
 * 
 * Requirements:
 *   - STORY_TEST_ACCOUNT environment variable set (wallet address)
 *   - Story testnet IP tokens for gas (get from faucet)
 */

import { createStoryClient } from "../lib/sdk/story/client";
import { createCollection } from "../lib/sdk/story/spg-service";
import { mintAndRegisterIp } from "../lib/sdk/story/spg-service";
import { getOrCreateCreatorCollection, getCreatorCollection } from "../lib/sdk/story/collection-service";
import type { Address } from "viem";

const TEST_ACCOUNT = process.env.STORY_TEST_ACCOUNT as Address | undefined;
const TEST_METADATA_URI = "ipfs://QmTest123..."; // Replace with actual IPFS URI

async function testCollectionCreation() {
  console.log("\n🧪 Testing Collection Creation...");

  if (!TEST_ACCOUNT) {
    console.error("❌ STORY_TEST_ACCOUNT not set. Set it in .env.local");
    return false;
  }

  try {
    const storyClient = createStoryClient(TEST_ACCOUNT);
    
    console.log("Creating test collection...");
    const result = await createCollection(storyClient, {
      name: "Test Collection",
      symbol: "TEST",
      description: "Test collection for Story Protocol integration",
    });

    console.log("✅ Collection creation transaction sent:");
    console.log(`   Transaction Hash: ${result.txHash}`);
    console.log(`   Collection Address: ${result.collectionAddress}`);
    
    // Note: Collection address extraction may need manual verification
    console.log("⚠️  Note: Verify collection address from transaction receipt if needed");

    return true;
  } catch (error) {
    console.error("❌ Collection creation failed:", error);
    return false;
  }
}

async function testGetOrCreateCollection() {
  console.log("\n🧪 Testing Get or Create Collection...");

  if (!TEST_ACCOUNT) {
    console.error("❌ STORY_TEST_ACCOUNT not set");
    return false;
  }

  try {
    const storyClient = createStoryClient(TEST_ACCOUNT);
    
    console.log("Getting or creating collection for test account...");
    const collectionAddress = await getOrCreateCreatorCollection(
      storyClient,
      TEST_ACCOUNT,
      "Test Creator's Videos",
      "TEST"
    );

    console.log("✅ Collection address:", collectionAddress);

    // Try getting it again (should use cached version)
    const cachedAddress = await getCreatorCollection(TEST_ACCOUNT);
    if (cachedAddress === collectionAddress) {
      console.log("✅ Collection caching works correctly");
    } else {
      console.warn("⚠️  Collection address mismatch between creation and retrieval");
    }

    return true;
  } catch (error) {
    console.error("❌ Get or create collection failed:", error);
    return false;
  }
}

async function testMintAndRegister() {
  console.log("\n🧪 Testing Mint and Register IP Asset...");

  if (!TEST_ACCOUNT) {
    console.error("❌ STORY_TEST_ACCOUNT not set");
    return false;
  }

  try {
    const storyClient = createStoryClient(TEST_ACCOUNT);
    
    // First, ensure we have a collection
    const collectionAddress = await getOrCreateCreatorCollection(
      storyClient,
      TEST_ACCOUNT,
      "Test Creator's Videos",
      "TEST"
    );

    console.log("Minting NFT and registering as IP Asset...");
    const result = await mintAndRegisterIp(storyClient, {
      collectionAddress,
      recipient: TEST_ACCOUNT,
      metadataURI: TEST_METADATA_URI,
      allowDuplicates: false,
    });

    console.log("✅ Mint and register successful:");
    console.log(`   Token ID: ${result.tokenId}`);
    console.log(`   IP ID: ${result.ipId}`);
    console.log(`   Transaction Hash: ${result.txHash}`);

    return true;
  } catch (error) {
    console.error("❌ Mint and register failed:", error);
    return false;
  }
}

async function main() {
  console.log("🚀 Story Protocol Integration Test Script\n");
  console.log("=" .repeat(60));

  if (!TEST_ACCOUNT) {
    console.error("❌ STORY_TEST_ACCOUNT environment variable not set");
    console.log("\nTo run tests:");
    console.log("1. Set STORY_TEST_ACCOUNT in .env.local");
    console.log("2. Ensure the account has Story testnet IP tokens for gas");
    console.log("3. Get testnet tokens from: https://docs.story.foundation/network/connect/aeneid");
    process.exit(1);
  }

  console.log(`Test Account: ${TEST_ACCOUNT}\n`);

  // Run tests
  const results = {
    collectionCreation: await testCollectionCreation(),
    getOrCreateCollection: await testGetOrCreateCollection(),
    mintAndRegister: await testMintAndRegister(),
  };

  // Summary
  console.log("\n" + "=" .repeat(60));
  console.log("📊 Test Results Summary:");
  console.log("=" .repeat(60));
  console.log(`Collection Creation: ${results.collectionCreation ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Get or Create Collection: ${results.getOrCreateCollection ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Mint and Register: ${results.mintAndRegister ? "✅ PASS" : "❌ FAIL"}`);

  const allPassed = Object.values(results).every((r) => r === true);
  
  if (allPassed) {
    console.log("\n✅ All tests passed!");
  } else {
    console.log("\n❌ Some tests failed. Check the errors above.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

