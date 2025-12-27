/**
 * StoryScan Contract Verification Script using Foundry
 * 
 * This script uses Foundry's verify-contract command to verify
 * the CreatorIPCollectionFactory contract on StoryScan (Blockscout)
 *
 * Usage:
 *   tsx scripts/verify-factory-foundry.ts
 *
 * Environment Variables:
 *   NEXT_STORYSCAN_API_KEY - StoryScan API key (optional)
 *   NEXT_PUBLIC_STORY_NETWORK - "testnet" (default) or "mainnet"
 *   FACTORY_ADDRESS - Contract address to verify (optional, uses latest deployment)
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";

// Load environment variables
dotenv.config({ path: ".env.local" });
if (!process.env.NEXT_STORYSCAN_API_KEY) {
  dotenv.config({ path: ".env" });
}

// Default to mainnet since the deployed contract is on mainnet
const STORY_NETWORK = process.env.NEXT_PUBLIC_STORY_NETWORK || "mainnet";
const STORYSCAN_API_KEY = process.env.NEXT_STORYSCAN_API_KEY;
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "0xD17C79631eAE76270ea2ACe8d107C258dfC77397";

// Configuration
const RPC_URL = STORY_NETWORK === "mainnet" 
  ? "https://homer.storyrpc.io"
  : "https://aeneid.storyrpc.io";

const VERIFIER_URL = STORY_NETWORK === "mainnet"
  ? "https://www.storyscan.io/api/"
  : "https://testnet.storyscan.io/api/";

const CHAIN_ID = STORY_NETWORK === "mainnet" ? 1514 : 1315;

const CONTRACT_FILE = "contracts/CreatorIPCollectionFactory.sol";
const CONTRACT_NAME = "CreatorIPCollectionFactory";
const COMPILER_VERSION = "0.8.20";
const OPTIMIZER_RUNS = 1; // Matches foundry.toml optimizer_runs = 1

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

async function getCollectionBytecodeHash(): Promise<string> {
  const outPath = path.join(process.cwd(), "out", "CreatorIPCollection.sol", "TokenERC721.json");
  
  if (fs.existsSync(outPath)) {
    const contractData = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    if (contractData.bytecode?.object) {
      const bytecode = contractData.bytecode.object as string;
      return keccak256(bytecode as `0x${string}`);
    }
  }
  
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
}

async function getConstructorArguments(): Promise<string> {
  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    console.log("   ⚠️  Deployments directory not found");
    return "";
  }

  // Try to find deployment file for the current network
  let files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith(`factory-${STORY_NETWORK}-`) && f.endsWith(".json"))
    .sort()
    .reverse();

  // If no files found for current network, try to find any mainnet deployment (since contract is on mainnet)
  if (files.length === 0) {
    console.log(`   ℹ️  No deployment file found for ${STORY_NETWORK}, looking for mainnet deployment...`);
    files = fs.readdirSync(deploymentsDir)
      .filter(f => f.startsWith("factory-mainnet-") && f.endsWith(".json"))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      console.log("   ⚠️  No deployment file found");
      return "";
    }
    console.log(`   ✅ Found mainnet deployment file: ${files[0]}`);
  }

  const latestFile = path.join(deploymentsDir, files[0]);
  const deployment = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
  
  console.log(`   📄 Using deployment file: ${path.basename(latestFile)}`);
  
  const collectionBytecodeHash = await getCollectionBytecodeHash();
  console.log(`   🔑 Collection bytecode hash: ${collectionBytecodeHash.substring(0, 20)}...`);
  
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
    console.warn("   ⚠️  Could not encode constructor arguments:", error);
    if (error instanceof Error) {
      console.warn("   Error details:", error.message);
    }
    return "";
  }
}

async function verifyContract() {
  console.log("🔍 StoryScan Contract Verification (Foundry)\n");
  console.log("=".repeat(60));
  console.log(`📡 Network: ${STORY_NETWORK === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)"}`);
  console.log(`📍 Contract Address: ${FACTORY_ADDRESS}`);
  console.log(`🔗 RPC URL: ${RPC_URL}`);
  console.log(`🔗 Verifier URL: ${VERIFIER_URL}`);
  console.log(`🔗 Chain ID: ${CHAIN_ID}`);
  console.log("=".repeat(60));
  console.log();

  // Check if forge is installed
  try {
    execSync("which forge", { stdio: "ignore" });
  } catch {
    console.error("❌ Foundry (forge) is not installed");
    console.error("   Install it from: https://book.getfoundry.sh/getting-started/installation");
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

  // Check if contract is compiled
  const compiledPath = path.join(process.cwd(), "out", "CreatorIPCollectionFactory.sol", "CreatorIPCollectionFactory.json");
  if (!fs.existsSync(compiledPath)) {
    console.log("📦 Compiling contracts...");
    try {
      execSync(`forge build --contracts ${CONTRACT_FILE}`, { stdio: "inherit" });
    } catch (error) {
      console.error("❌ Compilation failed");
      process.exit(1);
    }
  }

  // Get constructor arguments
  console.log("📋 Getting constructor arguments from deployment...");
  const constructorArgs = await getConstructorArguments();
  if (constructorArgs && constructorArgs !== "0x") {
    console.log(`✅ Constructor arguments encoded (${constructorArgs.length / 2 - 1} bytes)`);
    console.log(`   First 66 chars: ${constructorArgs.substring(0, 66)}...`);
  } else {
    console.log("⚠️  No constructor arguments found (contract may not have constructor args)");
  }
  console.log();

  // Build verify command (following Blockscout documentation format)
  console.log("🚀 Verifying contract with Foundry...");
  console.log();

  const verifyArgs = [
    "forge", "verify-contract",
    "--rpc-url", RPC_URL,
    contractAddress,
    `${CONTRACT_FILE}:${CONTRACT_NAME}`,
    "--verifier", "blockscout",
    "--verifier-url", VERIFIER_URL,
  ];

  // Add constructor arguments if available
  if (constructorArgs && constructorArgs !== "0x" && constructorArgs.length > 2) {
    verifyArgs.push("--constructor-args", constructorArgs);
  }

  // API key is optional for Blockscout, but include it if provided
  if (STORYSCAN_API_KEY) {
    verifyArgs.push("--etherscan-api-key", STORYSCAN_API_KEY);
  }

  // Compiler settings (these should match foundry.toml)
  verifyArgs.push("--compiler-version", COMPILER_VERSION);
  verifyArgs.push("--optimizer-runs", OPTIMIZER_RUNS.toString());

  const command = verifyArgs.join(" ");
  console.log("Running command:");
  console.log(command);
  console.log();

  try {
    execSync(command, { stdio: "inherit" });
    console.log();
    console.log("✅ Verification submitted successfully!");
    console.log(`🔗 Check status at: https://www.storyscan.io/address/${contractAddress}`);
  } catch (error) {
    console.error();
    console.error("❌ Verification failed");
    console.error("   Check the error message above for details");
    console.error();
    console.error("💡 Common issues:");
    console.error("   1. API key may be required - set NEXT_STORYSCAN_API_KEY");
    console.error("   2. Constructor arguments may be incorrect");
    console.error("   3. Compiler version or optimization settings may not match");
    console.error("   4. Network/RPC URL may be incorrect");
    process.exit(1);
  }
}

// Run verification
verifyContract().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

