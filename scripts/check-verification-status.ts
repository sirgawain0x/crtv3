/**
 * Check StoryScan Verification Status
 * 
 * Checks the status of a contract verification submission
 * 
 * Usage:
 *   tsx scripts/check-verification-status.ts <guid>
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!process.env.NEXT_STORYSCAN_API_KEY) {
  dotenv.config({ path: ".env" });
}

const STORY_NETWORK = process.env.NEXT_PUBLIC_STORY_NETWORK || "mainnet";
const STORYSCAN_API_KEY = process.env.NEXT_STORYSCAN_API_KEY;
const GUID = process.argv[2];

const STORYSCAN_API_URL = STORY_NETWORK === "mainnet" 
  ? "https://api.storyscan.io/api" 
  : "https://api-testnet.storyscan.io/api";
  
// Alternative endpoints to try if the above don't work:
// - https://storyscan.io/api
// - https://testnet.storyscan.io/api

async function checkStatus() {
  if (!GUID) {
    console.error("❌ Please provide a verification GUID");
    console.error("   Usage: tsx scripts/check-verification-status.ts <guid>");
    process.exit(1);
  }

  if (!STORYSCAN_API_KEY) {
    console.error("❌ NEXT_STORYSCAN_API_KEY environment variable is required");
    process.exit(1);
  }

  console.log(`🔍 Checking verification status for GUID: ${GUID}\n`);

  try {
    const params = new URLSearchParams({
      apikey: STORYSCAN_API_KEY,
      module: "contract",
      action: "checkverifystatus",
      guid: GUID,
    });

    const response = await fetch(`${STORYSCAN_API_URL}?${params}`);
    const result = await response.json();

    if (result.status === "1" || result.status === 1) {
      console.log("✅ Verification successful!");
      console.log(`   Contract is now verified on StoryScan`);
      if (result.result) {
        console.log(`   Details: ${result.result}`);
      }
    } else if (result.status === "0" || result.status === 0) {
      console.log("⏳ Verification still in progress...");
      console.log(`   Message: ${result.message || result.result || "Processing"}`);
    } else {
      console.error("❌ Verification failed or error occurred");
      console.error(`   Status: ${result.status}`);
      console.error(`   Message: ${result.message || result.result || "Unknown error"}`);
    }
  } catch (error) {
    console.error("❌ Error checking status:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
    }
    process.exit(1);
  }
}

checkStatus().catch(console.error);

