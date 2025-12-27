/**
 * CreatorIPCollectionFactory Deployment Script
 * 
 * Deploys the CreatorIPCollectionFactory contract to Story Protocol testnet (Aeneid)
 * 
 * Usage:
 *   # Testnet (default)
 *   tsx scripts/deploy-creator-ip-factory.ts
 *   
 *   # Mainnet
 *   NEXT_PUBLIC_STORY_NETWORK=mainnet tsx scripts/deploy-creator-ip-factory.ts
 * 
 * Environment Variables:
 *   DEPLOYER_PRIVATE_KEY - Private key of the deployer account (required)
 *   NEXT_PUBLIC_STORY_NETWORK - "testnet" (default) or "mainnet"
 *   NEXT_PUBLIC_STORY_RPC_URL - Custom RPC URL (optional)
 *   NEXT_PUBLIC_STORY_ALCHEMY_API_KEY - Alchemy API key for Story Protocol (optional)
 *   
 *   # Factory Configuration (optional, defaults provided)
 *   FACTORY_OWNER - Address that will own the factory (defaults to deployer)
 *   DEFAULT_CONTRACT_URI - Default contract URI for collections
 *   DEFAULT_ROYALTY_RECIPIENT - Default royalty recipient (can be zero address)
 *   DEFAULT_ROYALTY_BPS - Default royalty basis points (0-10000, default: 500 = 5%)
 *   DEFAULT_PLATFORM_FEE_RECIPIENT - Default platform fee recipient
 *   DEFAULT_PLATFORM_FEE_BPS - Default platform fee basis points (0-10000, default: 0)
 *   TRUSTED_FORWARDERS - Comma-separated list of trusted forwarder addresses
 */

import { createWalletClient, createPublicClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getStoryRpcUrl } from "../lib/sdk/story/client";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local (if it exists)
// Also try .env as fallback
const envLocalResult = dotenv.config({ path: ".env.local" });
if (envLocalResult.error && !process.env.DEPLOYER_PRIVATE_KEY) {
  // Try .env as fallback
  dotenv.config({ path: ".env" });
}

// Network configuration
const STORY_NETWORK = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
const STORY_TESTNET_CHAIN_ID = 1315; // Aeneid testnet
const STORY_MAINNET_CHAIN_ID = 1514; // Story mainnet
const CHAIN_ID = STORY_NETWORK === "mainnet" ? STORY_MAINNET_CHAIN_ID : STORY_TESTNET_CHAIN_ID;

// Factory configuration with defaults
const FACTORY_OWNER = (process.env.FACTORY_OWNER as Address) || undefined;
const DEFAULT_CONTRACT_URI = process.env.DEFAULT_CONTRACT_URI || "ipfs://QmDefaultContractURI";
const DEFAULT_ROYALTY_RECIPIENT = (process.env.DEFAULT_ROYALTY_RECIPIENT as Address) || "0x0000000000000000000000000000000000000000" as Address;
const DEFAULT_ROYALTY_BPS = process.env.DEFAULT_ROYALTY_BPS ? parseInt(process.env.DEFAULT_ROYALTY_BPS) : 500; // 5%
const DEFAULT_PLATFORM_FEE_RECIPIENT = (process.env.DEFAULT_PLATFORM_FEE_RECIPIENT as Address) || "0x0000000000000000000000000000000000000000" as Address;
const DEFAULT_PLATFORM_FEE_BPS = process.env.DEFAULT_PLATFORM_FEE_BPS ? parseInt(process.env.DEFAULT_PLATFORM_FEE_BPS) : 0; // 0%
const TRUSTED_FORWARDERS = process.env.TRUSTED_FORWARDERS 
  ? process.env.TRUSTED_FORWARDERS.split(",").map(addr => addr.trim() as Address)
  : [] as Address[];

// Contract bytecode and ABI
// We'll need to compile the contract first using Foundry
const CONTRACT_NAME = "CreatorIPCollectionFactory";
const CONTRACT_PATH = "contracts/CreatorIPCollectionFactory.sol";
const COLLECTION_CONTRACT_NAME = "TokenERC721";
const COLLECTION_CONTRACT_PATH = "contracts/CreatorIPCollection.sol";

async function getCollectionBytecodeHash(): Promise<Hex> {
  const { keccak256, toHex } = await import("viem");
  
  // Option 1: Check for bytecode in environment variable
  if (process.env.COLLECTION_BYTECODE) {
    const bytecode = process.env.COLLECTION_BYTECODE as Hex;
    if (bytecode.startsWith("0x") && bytecode.length > 2) {
      return keccak256(bytecode);
    }
  }

  // Option 2: Try to read from Foundry's output directory
  const outPath = path.join(process.cwd(), "out", "CreatorIPCollection.sol", COLLECTION_CONTRACT_NAME + ".json");
  
  if (fs.existsSync(outPath)) {
    const contractData = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    if (contractData.bytecode?.object) {
      const bytecode = contractData.bytecode.object as Hex;
      return keccak256(bytecode);
    }
  }
  
  // Option 3: Try to compile with Foundry if available
  const { execSync } = await import("child_process");
  try {
    execSync("which forge", { stdio: "ignore" });
    console.log("📦 Compiling collection contract with Foundry...");
    execSync(`forge build --contracts ${COLLECTION_CONTRACT_PATH}`, { stdio: "inherit" });
    
    // Try reading again after compilation
    if (fs.existsSync(outPath)) {
      const contractData = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      if (contractData.bytecode?.object) {
        const bytecode = contractData.bytecode.object as Hex;
        return keccak256(bytecode);
      }
    }
  } catch (error) {
    // Foundry not available or compilation failed
  }
  
  throw new Error(
    `Collection contract bytecode not found. Please compile the contract first:\n\n` +
    `Option 1: Install Foundry and compile:\n` +
    `  curl -L https://foundry.paradigm.xyz | bash\n` +
    `  foundryup\n` +
    `  forge build --contracts ${COLLECTION_CONTRACT_PATH}\n\n` +
    `Option 2: Set COLLECTION_BYTECODE=0x... in your .env.local file`
  );
}

async function getContractBytecode(): Promise<Hex> {
  // Option 1: Check for bytecode in environment variable
  if (process.env.FACTORY_BYTECODE) {
    const bytecode = process.env.FACTORY_BYTECODE as Hex;
    if (bytecode.startsWith("0x") && bytecode.length > 2) {
      return bytecode;
    }
  }

  // Option 2: Try to read from Foundry's output directory
  const outPath = path.join(process.cwd(), "out", CONTRACT_NAME + ".sol", CONTRACT_NAME + ".json");
  
  if (fs.existsSync(outPath)) {
    const contractData = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    if (contractData.bytecode?.object) {
      return contractData.bytecode.object as Hex;
    }
  }
  
  // Option 3: Try to compile with Foundry if available
  const { execSync } = await import("child_process");
  try {
    execSync("which forge", { stdio: "ignore" });
    console.log("📦 Compiling contract with Foundry...");
    execSync(`forge build --contracts ${CONTRACT_PATH}`, { stdio: "inherit" });
    
    // Try reading again after compilation
    if (fs.existsSync(outPath)) {
      const contractData = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      if (contractData.bytecode?.object) {
        return contractData.bytecode.object as Hex;
      }
    }
  } catch (error) {
    // Foundry not available or compilation failed
  }
  
  throw new Error(
    `Contract bytecode not found. Please compile the contract first:\n\n` +
    `Option 1: Install Foundry and compile:\n` +
    `  curl -L https://foundry.paradigm.xyz | bash\n` +
    `  foundryup\n` +
    `  forge build --contracts ${CONTRACT_PATH}\n\n` +
    `Option 2: Use Remix IDE or another Solidity compiler\n` +
    `  Then provide the bytecode via FACTORY_BYTECODE environment variable\n\n` +
    `Option 3: Set FACTORY_BYTECODE=0x... in your .env.local file`
  );
}

async function deployFactory() {
  console.log("🚀 CreatorIPCollectionFactory Deployment Script\n");
  console.log("=".repeat(60));
  console.log(`📡 Network: ${STORY_NETWORK === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)"}`);
  console.log(`🔗 Chain ID: ${CHAIN_ID}`);
  console.log(`🌐 RPC URL: ${getStoryRpcUrl()}`);
  console.log("=".repeat(60));
  console.log();

  // Validate private key
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerPrivateKey) {
    console.error("❌ DEPLOYER_PRIVATE_KEY environment variable is required");
    console.error("\n💡 Set it in your .env.local file:");
    console.error("   DEPLOYER_PRIVATE_KEY=0x...");
    process.exit(1);
  }

  // Validate configuration
  if (DEFAULT_ROYALTY_BPS > 10000) {
    console.error("❌ DEFAULT_ROYALTY_BPS cannot exceed 10000 (100%)");
    process.exit(1);
  }
  if (DEFAULT_PLATFORM_FEE_BPS > 10000) {
    console.error("❌ DEFAULT_PLATFORM_FEE_BPS cannot exceed 10000 (100%)");
    process.exit(1);
  }

  try {
    // Create account from private key
    const account = privateKeyToAccount(deployerPrivateKey as Hex);
    const deployerAddress = account.address;
    const factoryOwner = FACTORY_OWNER || deployerAddress;

    console.log(`👤 Deployer: ${deployerAddress}`);
    console.log(`👑 Factory Owner: ${factoryOwner}`);
    console.log();

    // Create clients
    const rpcUrl = getStoryRpcUrl();
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
      chain: {
        id: CHAIN_ID,
        name: STORY_NETWORK === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)",
        nativeCurrency: {
          name: "IP",
          symbol: "IP",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [rpcUrl],
          },
        },
      } as any,
    });

    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrl),
      chain: {
        id: CHAIN_ID,
        name: STORY_NETWORK === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)",
        nativeCurrency: {
          name: "IP",
          symbol: "IP",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [rpcUrl],
          },
        },
      } as any,
    });

    // Verify connection
    console.log("🔍 Verifying connection...");
    const chainId = await publicClient.getChainId();
    if (chainId !== CHAIN_ID) {
      console.error(`❌ Chain ID mismatch: expected ${CHAIN_ID}, got ${chainId}`);
      process.exit(1);
    }
    console.log(`✅ Connected to chain ${chainId}`);

    // Check balance
    const balance = await publicClient.getBalance({ address: deployerAddress });
    console.log(`💰 Deployer balance: ${balance.toString()} wei`);
    if (balance === BigInt(0)) {
      console.warn("⚠️  Deployer has zero balance. You may need to fund the account.");
      console.warn("   For testnet, use a faucet to get test tokens.");
    }
    console.log();

    // Get collection bytecode hash
    console.log("📦 Loading collection contract bytecode hash...");
    const collectionBytecodeHash = await getCollectionBytecodeHash();
    console.log(`✅ Collection bytecode hash: ${collectionBytecodeHash}`);
    console.log();

    // Get contract bytecode
    console.log("📦 Loading factory contract bytecode...");
    const bytecode = await getContractBytecode();
    console.log(`✅ Factory bytecode loaded (${bytecode.length / 2 - 1} bytes)`);
    console.log();

    // Prepare constructor arguments
    console.log("⚙️  Factory Configuration:");
    console.log(`   Default Contract URI: ${DEFAULT_CONTRACT_URI}`);
    console.log(`   Default Royalty Recipient: ${DEFAULT_ROYALTY_RECIPIENT}`);
    console.log(`   Default Royalty BPS: ${DEFAULT_ROYALTY_BPS} (${DEFAULT_ROYALTY_BPS / 100}%)`);
    console.log(`   Default Platform Fee Recipient: ${DEFAULT_PLATFORM_FEE_RECIPIENT}`);
    console.log(`   Default Platform Fee BPS: ${DEFAULT_PLATFORM_FEE_BPS} (${DEFAULT_PLATFORM_FEE_BPS / 100}%)`);
    console.log(`   Trusted Forwarders: ${TRUSTED_FORWARDERS.length > 0 ? TRUSTED_FORWARDERS.join(", ") : "None"}`);
    console.log();

    // Encode constructor arguments (now includes bytecode hash)
    const { encodeAbiParameters, parseAbiParameters } = await import("viem");
    const constructorArgs = encodeAbiParameters(
      parseAbiParameters("address, string, address, uint128, address, uint128, address[], bytes32"),
      [
        factoryOwner,
        DEFAULT_CONTRACT_URI,
        DEFAULT_ROYALTY_RECIPIENT,
        BigInt(DEFAULT_ROYALTY_BPS),
        DEFAULT_PLATFORM_FEE_RECIPIENT,
        BigInt(DEFAULT_PLATFORM_FEE_BPS),
        TRUSTED_FORWARDERS,
        collectionBytecodeHash,
      ]
    );

    // Deploy contract
    console.log("🚀 Deploying factory contract...");
    const hash = await walletClient.deployContract({
      abi: [], // We don't need ABI for deployment, just bytecode
      bytecode: bytecode + constructorArgs.slice(2) as Hex, // Remove 0x prefix and append
      account,
    });

    console.log(`📝 Deployment transaction: ${hash}`);
    console.log("⏳ Waiting for confirmation...");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (!receipt.contractAddress) {
      console.error("❌ Deployment failed: No contract address in receipt");
      process.exit(1);
    }

    const factoryAddress = receipt.contractAddress;
    console.log();
    console.log("✅ Factory deployed successfully!");
    console.log("=".repeat(60));
    console.log(`📍 Factory Address: ${factoryAddress}`);
    console.log(`📝 Transaction Hash: ${hash}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
    console.log("=".repeat(60));
    console.log();

    // Verify deployment
    console.log("🔍 Verifying deployment...");
    const code = await publicClient.getBytecode({ address: factoryAddress });
    if (!code || code === "0x") {
      console.error("❌ Verification failed: Contract has no code");
      process.exit(1);
    }
    console.log("✅ Contract code verified");
    console.log();

    // Save deployment info
    const deploymentInfo = {
      network: STORY_NETWORK,
      chainId: CHAIN_ID,
      factoryAddress,
      transactionHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      deployer: deployerAddress,
      owner: factoryOwner,
      config: {
        defaultContractURI: DEFAULT_CONTRACT_URI,
        defaultRoyaltyRecipient: DEFAULT_ROYALTY_RECIPIENT,
        defaultRoyaltyBps: DEFAULT_ROYALTY_BPS,
        defaultPlatformFeeRecipient: DEFAULT_PLATFORM_FEE_RECIPIENT,
        defaultPlatformFeeBps: DEFAULT_PLATFORM_FEE_BPS,
        trustedForwarders: TRUSTED_FORWARDERS,
      },
      deployedAt: new Date().toISOString(),
    };

    const deploymentFile = path.join(
      process.cwd(),
      `deployments`,
      `factory-${STORY_NETWORK}-${receipt.blockNumber}.json`
    );
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.dirname(deploymentFile);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to: ${deploymentFile}`);
    console.log();

    // Print environment variable
    console.log("📋 Add this to your .env.local file:");
    console.log(`   NEXT_PUBLIC_CREATOR_IP_FACTORY_ADDRESS=${factoryAddress}`);
    console.log();

    console.log("🎉 Deployment complete!");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
    }
    process.exit(1);
  }
}

// Run deployment
deployFactory().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

