#!/usr/bin/env npx tsx
/**
 * Read registerController() on the live Base MeTokens diamond (read-only).
 */
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { METOKEN_DIAMOND_BASE } from "@/lib/contracts/metokens/deployments";

const abi = parseAbi(["function registerController() view returns (address)"]);

async function main() {
  const client = createPublicClient({ chain: base, transport: http() });
  const controller = await client.readContract({
    address: METOKEN_DIAMOND_BASE,
    abi,
    functionName: "registerController",
  });
  console.log(JSON.stringify({ diamond: METOKEN_DIAMOND_BASE, registerController: controller }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
