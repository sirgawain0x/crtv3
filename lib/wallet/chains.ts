import { base as viemBase } from "viem/chains";
import type { Chain } from "viem";
import { getStoryChain } from "@/lib/sdk/story/chains";
import { getLensChain } from "@/lib/sdk/lens/chains";

export const storyChain = getStoryChain();
export const lensChain = getLensChain();

/** Default signing chain (Base mainnet). */
export const defaultWalletChain: Chain = viemBase;

/** Chains available for wallet signing in the app UI. */
export const walletChains: Chain[] = [viemBase, storyChain, lensChain];

export function getWalletChainById(chainId: number): Chain | undefined {
  return walletChains.find((c) => c.id === chainId);
}
