import { createPublicClient, erc20Abi, http, type Address } from "viem";
import { base } from "viem/chains";
import { USDC_TOKEN_ADDRESSES } from "@/lib/contracts/USDCToken";

/** Server balance reads must not use the browser's origin-restricted API key. */
export async function getEarnUsdcBalance(owner: Address): Promise<bigint> {
  const apiKey = process.env.ALCHEMY_API_KEY?.trim();
  const rpcUrl =
    process.env.BASE_RPC_URL?.trim() ||
    process.env.ALCHEMY_RPC_URL?.trim() ||
    (apiKey ? `https://base-mainnet.g.alchemy.com/v2/${apiKey}` : null);

  if (!rpcUrl) {
    throw new Error("Earn balance service is not configured. Please try again later.");
  }

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl, { retryCount: 0, timeout: 10_000 }),
  });

  try {
    return await client.readContract({
      address: USDC_TOKEN_ADDRESSES.base as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });
  } catch {
    // RPC errors contain URLs, credentials and call arguments. Keep them private.
    throw new Error("Unable to load your USDC balance. Please try again shortly.");
  }
}
