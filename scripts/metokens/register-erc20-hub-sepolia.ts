#!/usr/bin/env npx tsx
/**
 * Register a NEW MeToken hub with an arbitrary ERC-20 collateral on Base Sepolia.
 *
 * PR1 scaffold only — never executed by CI/agents; requires admin keys at runtime.
 * Does NOT touch Base mainnet, hub 2 (USDC/CRTVAI), or existing hubs.
 *
 * Usage (human operator, Sepolia):
 *   HUB_ASSET_ADDRESS=0x... ASSET_DECIMALS=8 VAULT_ADDRESS=0x... \
 *   DIAMOND_OWNER_PRIVATE_KEY=0x... HUB_OWNER_ADDRESS=0x... \
 *   npx tsx scripts/metokens/register-erc20-hub-sepolia.ts
 *
 * Set METOKEN_DIAMOND_SEPOLIA if your Sepolia diamond differs from the placeholder below.
 */
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "@/lib/utils/chains/base";
import { STOCK_BACKING_FORBIDDEN_HUB_IDS } from "@/lib/metokens/stock-backing-extension";

/** Replace after confirming Sepolia MeTokens deployment (not documented in repo manifest). */
const DEFAULT_SEPOLIA_DIAMOND =
  (process.env.METOKEN_DIAMOND_SEPOLIA as `0x${string}` | undefined) ??
  ("0x0000000000000000000000000000000000000000" as `0x${string}`);

const REGISTER_ABI = parseAbi([
  "function register(address owner, address asset, address vault, uint256 refundRatio, uint256 baseY, uint32 reserveWeight, bytes encodedVaultArgs)",
  "function registerController()(address)",
]);

async function main() {
  if (process.env.ALLOW_STOCK_HUB_REGISTER_SCRIPT !== "true") {
    console.error(`
Refusing to run: set ALLOW_STOCK_HUB_REGISTER_SCRIPT=true to acknowledge Sepolia-only admin registration.
This script performs on-chain writes and must never run in CI.
`);
    process.exit(1);
  }

  const asset = process.env.HUB_ASSET_ADDRESS as `0x${string}` | undefined;
  const vault = process.env.VAULT_ADDRESS as `0x${string}` | undefined;
  const privateKey = process.env.DIAMOND_OWNER_PRIVATE_KEY as
    | `0x${string}`
    | undefined;
  const hubOwner = (process.env.HUB_OWNER_ADDRESS ??
    (privateKey ? privateKeyToAccount(privateKey).address : undefined)) as
    | `0x${string}`
    | undefined;
  const decimals = Number(process.env.ASSET_DECIMALS ?? "8");

  if (!asset || !vault || !privateKey || !hubOwner) {
    console.error("Missing HUB_ASSET_ADDRESS, VAULT_ADDRESS, DIAMOND_OWNER_PRIVATE_KEY, or HUB_OWNER_ADDRESS");
    process.exit(1);
  }

  if (STOCK_BACKING_FORBIDDEN_HUB_IDS.includes(2)) {
    console.log("Guard: hub id 2 (USDC / CRTVAI) must never be mutated by this script.");
  }

  console.log(`Target: Base Sepolia (${baseSepolia.id}), diamond ${DEFAULT_SEPOLIA_DIAMOND}`);
  console.log(`Asset ${asset} (${decimals} decimals), vault ${vault}, owner ${hubOwner}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  try {
    const controller = await publicClient.readContract({
      address: DEFAULT_SEPOLIA_DIAMOND,
      abi: REGISTER_ABI,
      functionName: "registerController",
    });
    console.log("registerController():", controller);
  } catch (err) {
    console.warn("Could not read registerController (diamond placeholder or RPC):", err);
  }

  const refundRatio = BigInt(process.env.HUB_REFUND_RATIO ?? "500000000000000000");
  const baseY = BigInt(process.env.HUB_BASE_Y ?? "1000000000000000000");
  const reserveWeight = Number(process.env.HUB_RESERVE_WEIGHT ?? "500000");

  console.log("Prepared register() args — submit manually after vault approval on Sepolia.");
  console.log({
    owner: hubOwner,
    asset,
    vault,
    refundRatio: refundRatio.toString(),
    baseY: baseY.toString(),
    reserveWeight,
    encodedVaultArgs: "0x",
  });

  if (process.env.EXECUTE_REGISTER === "true") {
    const hash = await walletClient.writeContract({
      address: DEFAULT_SEPOLIA_DIAMOND,
      abi: REGISTER_ABI,
      functionName: "register",
      args: [hubOwner, asset, vault, refundRatio, baseY, reserveWeight, "0x"],
    });
    console.log("register tx:", hash);
  } else {
    console.log("Dry run only (set EXECUTE_REGISTER=true to broadcast).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
