"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@account-kit/react';
import { useSmartAccountClient } from '@account-kit/react';
import { formatEther, parseEther } from 'viem';
import { meTokensSubgraph } from '@/lib/sdk/metokens/subgraph';
import { creatorProfileSupabaseService, CreatorProfile } from '@/lib/sdk/supabase/creator-profiles';
import { logger } from '@/lib/utils/logger';
import { METOKEN_DIAMOND_BASE } from '@/lib/contracts/MeTokenHubs';
import { formatHubAssetAmount, resolveHubAsset } from '@/lib/utils/hubAssetUtils';

const DIAMOND = METOKEN_DIAMOND_BASE;

const DIAMOND_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'meToken', type: 'address' }],
    name: 'getMeTokenInfo',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'hubId', type: 'uint256' },
          { internalType: 'uint256', name: 'balancePooled', type: 'uint256' },
          { internalType: 'uint256', name: 'balanceLocked', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'uint256', name: 'targetHubId', type: 'uint256' },
          { internalType: 'address', name: 'migration', type: 'address' },
        ],
        internalType: 'struct MeTokenInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface MeTokenHolding {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  balanceRaw: bigint;
  totalSupply: bigint;
  tvl: number;
  creatorProfile: CreatorProfile | null;
  ownerAddress: string;
  isOwnMeToken: boolean;
  hubId: number;
  balancePooled: bigint;
  balanceLocked: bigint;
  startTime: bigint;
  endTime: bigint;
  endCooldown: bigint;
  targetHubId: number;
  migration: boolean;
  collateralSymbol: string;
  collateralDisplayName: string;
}

export interface UseMeTokenHoldingsResult {
  holdings: MeTokenHolding[];
  loading: boolean;
  error: string | null;
  totalValue: number;
  refreshHoldings: () => Promise<void>;
}

interface BalanceCandidate {
  meToken: string;
  balance: bigint;
}

const HOLDINGS_CACHE_TTL_MS = 45 * 1000;
const holdingsCache = new Map<string, { holdings: MeTokenHolding[]; timestamp: number }>();

async function fetchBalanceCandidates(address: string): Promise<BalanceCandidate[]> {
  try {
    const indexed = await meTokensSubgraph.getMeTokenBalancesByUser(address, 100, 0);
    if (indexed.length > 0) {
      return indexed.map((row) => ({
        meToken: row.meToken,
        balance: BigInt(row.balance),
      }));
    }
  } catch (subgraphError) {
    logger.warn('Indexed balance query failed, trying Supabase fallback:', subgraphError);
  }

  try {
    const { MeTokenSupabaseService } = await import('@/lib/sdk/supabase/metokens');
    const service = new MeTokenSupabaseService();
    const rows = await service.getUserMeTokenBalances(address);
    if (rows.length > 0) {
      return rows.map((row) => ({
        meToken: row.metoken?.address ?? '',
        balance: parseEther(String(row.balance ?? 0)),
      })).filter((r) => r.meToken);
    }
  } catch (supabaseError) {
    logger.warn('Supabase balance fallback failed:', supabaseError);
  }

  return [];
}

function calculateTVL(info: {
  balancePooled?: bigint | number | string;
  balanceLocked?: bigint | number | string;
  hubId?: number;
}, assetAddress?: string): number {
  const balancePooled = BigInt(info.balancePooled ?? 0);
  const balanceLocked = BigInt(info.balanceLocked ?? 0);
  const totalBalance = balancePooled + balanceLocked;
  const asset = resolveHubAsset(info.hubId, assetAddress);
  return Number(formatHubAssetAmount(totalBalance, asset));
}

export function useMeTokenHoldings(targetAddress?: string): UseMeTokenHoldingsResult {
  const user = useUser();
  const { client, address: scaAddress } = useSmartAccountClient({});
  const [holdings, setHoldings] = useState<MeTokenHolding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = targetAddress || scaAddress || user?.address;

  const fetchHoldings = useCallback(async () => {
    if (!address || !client) {
      setHoldings([]);
      return;
    }

    const cacheKey = address.toLowerCase();
    const cached = holdingsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < HOLDINGS_CACHE_TTL_MS) {
      setHoldings(cached.holdings);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.debug('Fetching indexed MeToken holdings for:', address);

      const candidates = await fetchBalanceCandidates(address);

      const holdingsResults = await Promise.all(
        candidates.map(async ({ meToken }) => {
          try {
            const meTokenAddress = meToken as `0x${string}`;

            const [info, onChainBalance, name, symbol, totalSupply] = await Promise.all([
              client.readContract({
                address: DIAMOND,
                abi: DIAMOND_ABI,
                functionName: 'getMeTokenInfo',
                args: [meTokenAddress],
              }) as Promise<any>,
              client.readContract({
                address: meTokenAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address as `0x${string}`],
              }) as Promise<bigint>,
              client.readContract({
                address: meTokenAddress,
                abi: ERC20_ABI,
                functionName: 'name',
              }) as Promise<string>,
              client.readContract({
                address: meTokenAddress,
                abi: ERC20_ABI,
                functionName: 'symbol',
              }) as Promise<string>,
              client.readContract({
                address: meTokenAddress,
                abi: ERC20_ABI,
                functionName: 'totalSupply',
              }) as Promise<bigint>,
            ]);

            const balance = onChainBalance;
            if (balance <= BigInt(0)) {
              return null;
            }

            const isOwnMeToken = info.owner.toLowerCase() === address.toLowerCase();
            const hubId = Number(info.hubId);
            const collateral = resolveHubAsset(hubId);
            const tvl = calculateTVL(
              {
                balancePooled: info.balancePooled,
                balanceLocked: info.balanceLocked,
                hubId,
              }
            );

            let creatorProfile: CreatorProfile | null = null;
            try {
              creatorProfile = await creatorProfileSupabaseService.getCreatorProfileByOwner(info.owner);
            } catch (profileError) {
              logger.warn(`Failed to fetch creator profile for ${info.owner}:`, profileError);
            }

            return {
              address: meToken,
              name,
              symbol,
              balance: formatEther(balance),
              balanceRaw: balance,
              totalSupply,
              tvl,
              creatorProfile,
              ownerAddress: info.owner,
              isOwnMeToken,
              hubId,
              balancePooled: BigInt(info.balancePooled || 0),
              balanceLocked: BigInt(info.balanceLocked || 0),
              startTime: BigInt(info.startTime || 0),
              endTime: BigInt(info.endTime || 0),
              endCooldown: BigInt(info.endCooldown || 0),
              targetHubId: Number(info.targetHubId || 0),
              migration: Boolean(info.migration),
              collateralSymbol: collateral.symbol,
              collateralDisplayName: collateral.displayName,
            } satisfies MeTokenHolding;
          } catch (tokenError) {
            logger.warn(`Failed to hydrate MeToken ${meToken}:`, tokenError);
            return null;
          }
        })
      );

      const userHoldings = holdingsResults.filter((h): h is MeTokenHolding => h !== null);

      userHoldings.sort((a, b) => {
        if (a.isOwnMeToken && !b.isOwnMeToken) return -1;
        if (!a.isOwnMeToken && b.isOwnMeToken) return 1;
        return Number(b.balance) - Number(a.balance);
      });

      holdingsCache.set(cacheKey, { holdings: userHoldings, timestamp: Date.now() });
      setHoldings(userHoldings);
    } catch (err) {
      logger.error('Error fetching MeToken holdings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch holdings');
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  }, [address, client]);

  const totalValue = holdings.reduce((sum, holding) => {
    return sum + (Number(holding.balance) * (holding.tvl / 1000000));
  }, 0);

  useEffect(() => {
    fetchHoldings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAddress, address, client]);

  return {
    holdings,
    loading,
    error,
    totalValue,
    refreshHoldings: fetchHoldings,
  };
}
