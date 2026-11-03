import { createPublicClient, formatEther, http, fallback, parseAbi } from 'viem';
import { baseMainnet } from '@/lib/utils/chains/base';
import { METOKEN_DIAMOND_BASE } from '@/lib/contracts/metokens/deployments';
import { METOKEN_ABI } from '@/lib/contracts/MeToken';
import { computeMeTokenSpotPriceUsd } from '@/lib/metokens/spotPrice';
import {
  getCachedLiveMeTokenMarket,
  setCachedLiveMeTokenMarket,
  type LiveMeTokenMarket,
} from '@/lib/metokens/liveMeTokenMarketCache';

export type { LiveMeTokenMarket };

const ERC20_SUPPLY_ABI = parseAbi(['function totalSupply() view returns (uint256)']);

function buildPublicClient() {
  const rpcUrls: string[] = [];
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const alchemyRpc = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  const baseRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL;
  if (apiKey) rpcUrls.push(`https://base-mainnet.g.alchemy.com/v2/${apiKey}`);
  if (alchemyRpc) rpcUrls.push(alchemyRpc);
  if (baseRpc) rpcUrls.push(baseRpc);
  rpcUrls.push('https://mainnet.base.org');

  return createPublicClient({
    chain: baseMainnet,
    transport: fallback(rpcUrls.map((url) => http(url))),
  });
}

type LiveMarketFetcher = (
  meTokenAddress: string,
  hubIdHint?: number
) => Promise<LiveMeTokenMarket | null>;

let liveMarketFetcher: LiveMarketFetcher = fetchLiveMeTokenMarketUncachedImpl;

export function __setLiveMeTokenMarketFetcherForTests(
  fetcher: LiveMarketFetcher
): void {
  liveMarketFetcher = fetcher;
}

export function __resetLiveMeTokenMarketFetcherForTests(): void {
  liveMarketFetcher = fetchLiveMeTokenMarketUncachedImpl;
}

async function fetchLiveMeTokenMarketUncachedImpl(
  meTokenAddress: string,
  hubIdHint?: number
): Promise<LiveMeTokenMarket | null> {
  try {
    const address = meTokenAddress.toLowerCase() as `0x${string}`;
    const publicClient = buildPublicClient();

    const [totalSupplyWei, infoData] = await Promise.all([
      publicClient.readContract({
        address,
        abi: ERC20_SUPPLY_ABI,
        functionName: 'totalSupply',
      }) as Promise<bigint>,
      publicClient.readContract({
        address: METOKEN_DIAMOND_BASE,
        abi: METOKEN_ABI,
        functionName: 'getMeTokenInfo',
        args: [address],
      }) as Promise<{
        hubId?: bigint | number;
        balancePooled?: bigint;
        balanceLocked?: bigint;
        [key: string]: unknown;
      }>,
    ]);

    const balancePooled = BigInt(infoData.balancePooled ?? 0);
    const balanceLocked = BigInt(infoData.balanceLocked ?? 0);
    const hubId = Number(infoData.hubId ?? hubIdHint ?? 0);
    const { tvl, price } = computeMeTokenSpotPriceUsd(
      balancePooled,
      balanceLocked,
      hubId,
      totalSupplyWei
    );

    return { totalSupplyWei, tvl, price, hubId };
  } catch {
    return null;
  }
}

export async function fetchLiveMeTokenMarketUncached(
  meTokenAddress: string,
  hubIdHint?: number
): Promise<LiveMeTokenMarket | null> {
  return liveMarketFetcher(meTokenAddress, hubIdHint);
}

/**
 * Same TVL/price source as the market list (`getBulkMeTokenInfo` / fresh route).
 */
export async function resolveLiveMeTokenMarket(
  meTokenAddress: string,
  hubIdHint?: number,
  nowMs: number = Date.now()
): Promise<LiveMeTokenMarket | null> {
  const cached = getCachedLiveMeTokenMarket(meTokenAddress, nowMs);
  if (cached) {
    return cached;
  }

  const live = await liveMarketFetcher(meTokenAddress, hubIdHint);
  if (live) {
    setCachedLiveMeTokenMarket(meTokenAddress, live, nowMs);
  }
  return live;
}

export function formatEtherSupply(totalSupplyWei: bigint): number {
  return parseFloat(formatEther(totalSupplyWei));
}
