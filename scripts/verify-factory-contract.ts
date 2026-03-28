/**
 * StoryScan Contract Verification Script
 * 
 * Verifies the CreatorIPCollectionFactory contract on StoryScan block explorer
 * 
 * Usage:
 *   tsx scripts/verify-factory-contract.ts
 * 
 * Environment Variables:
 *   NEXT_STORYSCAN_API_KEY - StoryScan API key (required)
 *   NEXT_PUBLIC_STORY_NETWORK - "testnet" (default) or "mainnet"
 *   FACTORY_ADDRESS - Contract address to verify (optional, will use latest deployment)
 */

import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { keccak256, toHex } from "viem";

// Load environment variables
dotenv.config({ path: ".env.local" });
if (!process.env.NEXT_STORYSCAN_API_KEY) {
  dotenv.config({ path: ".env" });
}

const STORY_NETWORK = process.env.NEXT_PUBLIC_STORY_NETWORK || "mainnet";
const STORYSCAN_API_KEY = process.env.NEXT_STORYSCAN_API_KEY;
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "0xD17C79631eAE76270ea2ACe8d107C258dfC77397";

// StoryScan API endpoints
// StoryScan uses similar API to Etherscan
// Try common patterns - user may need to adjust based on actual StoryScan API docs
const STORYSCAN_API_URL = STORY_NETWORK === "mainnet" 
  ? "https://api.storyscan.io/api" 
  : "https://api-testnet.storyscan.io/api";
  
// Alternative endpoints to try if the above don't work:
// - https://storyscan.io/api
// - https://testnet.storyscan.io/api
// - https://explorer.story.foundation/api (if Story uses different explorer)

const CONTRACT_NAME = "CreatorIPCollectionFactory";
const CONTRACT_PATH = "contracts/CreatorIPCollectionFactory.sol";
const COMPILER_VERSION = "v0.8.20+commit.a1b79de6"; // Solidity version used
const OPTIMIZATION_ENABLED = true;
const OPTIMIZATION_RUNS = 200;
const EVM_VERSION = "default";
const LICENSE_TYPE = "MIT";

async function getLatestDeploymentAddress(): Promise<string | null> {
  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    return null;
  }

  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith(`factory-${STORY_NETWORK}-`) && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  const latestFile = path.join(deploymentsDir, files[0]);
  const deployment = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
  return deployment.factoryAddress;
}

async function getContractSourceCode(): Promise<string> {
  const contractPath = path.join(process.cwd(), CONTRACT_PATH);
  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract file not found: ${contractPath}`);
  }
  return fs.readFileSync(contractPath, "utf-8");
}

async function getFlattenedSourceCode(): Promise<string> {
  // For now, return the main contract source
  // In a full implementation, you'd resolve all imports
  const source = await getContractSourceCode();
  
  // Basic import resolution - replace common imports with their content
  let flattened = source;
  
  // Replace OpenZeppelin imports with their actual paths (for verification)
  flattened = flattened.replace(
    /import "@openzeppelin\/contracts\/([^"]+)";/g,
    (match, importPath) => {
      // For verification, we might need to include these or use a flattener
      return `// ${match}`;
    }
  );

  return flattened;
}

async function getCollectionBytecodeHash(): Promise<string> {
  // Try to get from compiled contract
  const { keccak256 } = await import("viem");
  const outPath = path.join(process.cwd(), "out", "CreatorIPCollection.sol", "TokenERC721.json");
  
  if (fs.existsSync(outPath)) {
    const contractData = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    if (contractData.bytecode?.object) {
      const bytecode = contractData.bytecode.object as string;
      return keccak256(bytecode as `0x${string}`);
    }
  }
  
  // Fallback: return zero hash (will need to be provided manually)
  console.warn("⚠️  Could not find collection bytecode, using zero hash");
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
}

async function getConstructorArguments(): Promise<string> {
  // Read from latest deployment file
  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    return "0x"; // No constructor args
  }

  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith(`factory-${STORY_NETWORK}-`) && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    return "0x";
  }

  const latestFile = path.join(deploymentsDir, files[0]);
  const deployment = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
  
  // Get collection bytecode hash
  const collectionBytecodeHash = await getCollectionBytecodeHash();
  
  // Reconstruct constructor arguments from deployment info
  // This must match the exact encoding used during deployment
  const { encodeAbiParameters, parseAbiParameters } = await import("viem");
  
  try {
    const constructorArgs = encodeAbiParameters(
      parseAbiParameters("address, string, address, uint128, address, uint128, address[], bytes32"),
      [
        deployment.owner,
        deployment.config.defaultContractURI,
        deployment.config.defaultRoyaltyRecipient,
        BigInt(deployment.config.defaultRoyaltyBps),
        deployment.config.defaultPlatformFeeRecipient,
        BigInt(deployment.config.defaultPlatformFeeBps),
        deployment.config.trustedForwarders || [],
        collectionBytecodeHash as `0x${string}`,
      ]
    );
    return constructorArgs;
  } catch (error) {
    console.warn("⚠️  Could not reconstruct constructor arguments, using empty:", error);
    return "0x";
  }
}

async function verifyContract() {
  console.log("🔍 StoryScan Contract Verification Script\n");
  console.log("=".repeat(60));
  console.log(`📡 Network: ${STORY_NETWORK === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)"}`);
  console.log(`📍 Contract Address: ${FACTORY_ADDRESS}`);
  console.log(`🔗 API URL: ${STORYSCAN_API_URL}`);
  console.log("=".repeat(60));
  console.log();

  if (!STORYSCAN_API_KEY) {
    console.error("❌ NEXT_STORYSCAN_API_KEY environment variable is required");
    console.error("\n💡 Set it in your .env.local file:");
    console.error("   NEXT_STORYSCAN_API_KEY=your_api_key_here");
    process.exit(1);
  }

  // Use provided address or try to get from latest deployment
  let contractAddress = FACTORY_ADDRESS;
  if (contractAddress === "0xD17C79631eAE76270ea2ACe8d107C258dfC77397" || !contractAddress) {
    const latest = await getLatestDeploymentAddress();
    if (latest) {
      contractAddress = latest;
      console.log(`📋 Using latest deployment address: ${contractAddress}`);
    }
  }

  console.log(`📦 Loading contract source code...`);
  const sourceCode = await getContractSourceCode();
  console.log(`✅ Source code loaded (${sourceCode.length} characters)`);
  console.log();

  console.log(`📦 Getting constructor arguments...`);
  const constructorArgs = await getConstructorArguments();
  console.log(`✅ Constructor arguments: ${constructorArgs.substring(0, 66)}...`);
  console.log();

  console.log("🚀 Submitting verification request to StoryScan...");

  try {
    // StoryScan API typically uses similar format to Etherscan
    // Format: module=contract&action=verifysourcecode
    const verificationData = {
      apikey: STORYSCAN_API_KEY,
      module: "contract",
      action: "verifysourcecode",
      contractaddress: contractAddress,
      sourceCode: sourceCode,
      codeformat: "solidity-single-file", // or "solidity-standard-json-input"
      contractname: CONTRACT_NAME,
      compilerversion: COMPILER_VERSION,
      optimizationUsed: OPTIMIZATION_ENABLED ? 1 : 0,
      runs: OPTIMIZATION_RUNS,
      evmversion: EVM_VERSION,
      licenseType: LICENSE_TYPE,
      constructorArguements: constructorArgs.slice(2), // Remove 0x prefix
    };

    let response;
    let result;
    
    try {
      response = await fetch(STORYSCAN_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(
          Object.entries(verificationData).map(([k, v]) => [k, String(v)])
        ),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      result = await response.json();
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.message.includes("ENOTFOUND")) {
        console.error("❌ Could not connect to StoryScan API");
        console.error(`   URL attempted: ${STORYSCAN_API_URL}`);
        console.error();
        console.error("💡 Possible solutions:");
        console.error("   1. Check if StoryScan API endpoint is correct");
        console.error("   2. Verify NEXT_STORYSCAN_API_KEY is valid");
        console.error("   3. Check StoryScan documentation for correct API endpoint");
        console.error("   4. Try manual verification via StoryScan web interface:");
        console.error(`      ${STORY_NETWORK === "mainnet" ? "https://storyscan.io" : "https://testnet.storyscan.io"}/address/${contractAddress}`);
        console.error();
        console.error("📋 Manual Verification Steps:");
        console.error("   1. Go to StoryScan block explorer");
        console.error("   2. Navigate to your contract address");
        console.error("   3. Click 'Verify and Publish'");
        console.error("   4. Enter contract details:");
        console.error(`      - Compiler Version: ${COMPILER_VERSION}`);
        console.error(`      - Optimization: ${OPTIMIZATION_ENABLED ? "Yes" : "No"} (${OPTIMIZATION_RUNS} runs)`);
        console.error(`      - EVM Version: ${EVM_VERSION}`);
        console.error(`      - License: ${LICENSE_TYPE}`);
        console.error("   5. Paste flattened source code");
        console.error("   6. Enter constructor arguments (if any)");
      }
      throw fetchError;
    }

    if (result.status === "1" || result.status === 1) {
      console.log("✅ Verification submitted successfully!");
      console.log(`📝 GUID: ${result.result}`);
      console.log();
      console.log("⏳ Verification is being processed...");
      console.log("   This may take a few minutes.");
      console.log();
      console.log(`🔗 Check status at: ${STORY_NETWORK === "mainnet" ? "https://storyscan.io" : "https://testnet.storyscan.io"}/address/${contractAddress}`);
      console.log();
      console.log("💡 To check verification status, run:");
      console.log(`   tsx scripts/check-verification-status.ts ${result.result}`);
    } else {
      console.error("❌ Verification submission failed");
      console.error(`   Status: ${result.status}`);
      console.error(`   Message: ${result.message || result.result || "Unknown error"}`);
      if (result.result) {
        console.error(`   Details: ${result.result}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error submitting verification:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
    }
    process.exit(1);
  }
}

// Run verification
verifyContract().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

