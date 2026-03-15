/**
 * Story Protocol chain definitions for app config (Account Kit / wagmi).
 * Used for client-side signing and chain switching when interacting with Story Protocol.
 */
import type { Chain } from "viem";

const storyRpcUrl = (network: "mainnet" | "testnet") => {
  const key = process.env.NEXT_PUBLIC_STORY_ALCHEMY_API_KEY;
  if (key) {
    return network === "mainnet"
      ? `https://story-mainnet.g.alchemy.com/v2/${key}`
      : `https://story-testnet.g.alchemy.com/v2/${key}`;
  }
  return network === "mainnet"
    ? "https://rpc.story.foundation"
    : "https://rpc.aeneid.story.foundation";
};

/** Story Protocol testnet (Aeneid), chain ID 1315 */
export const storyAeneid: Chain = {
  id: 1315,
  name: "Story Testnet (Aeneid)",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: {
    default: { http: [storyRpcUrl("testnet")] },
  },
  blockExplorers: {
    default: { name: "StoryScan", url: "https://aeneid.storyscan.io" },
  },
  testnet: true,
};

/** Story Protocol mainnet, chain ID 1514 */
export const storyMainnet: Chain = {
  id: 1514,
  name: "Story Mainnet",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: {
    default: { http: [storyRpcUrl("mainnet")] },
  },
  blockExplorers: {
    default: { name: "StoryScan", url: "https://www.storyscan.io" },
  },
};

/** Story chain for current env (NEXT_PUBLIC_STORY_NETWORK). */
export function getStoryChain(): Chain {
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
  return network === "mainnet" ? storyMainnet : storyAeneid;
}
