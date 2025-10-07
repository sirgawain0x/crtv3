"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@account-kit/react';
import { useSmartAccountClient } from '@account-kit/react';
import { formatEther } from 'viem';
import { meTokensSubgraph } from '@/lib/sdk/metokens/subgraph';
import { creatorProfileSupabaseService, CreatorProfile } from '@/lib/sdk/supabase/creator-profiles';

// MeTokens contract addresses on Base
const DIAMOND = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';

// ABI for Diamond contract (key functions for MeTokens)
const DIAMOND_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "meToken",
        "type": "address"
      }
    ],
    "name": "getMeTokenInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "hubId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "balancePooled",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "balanceLocked",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "targetHubId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "migration",
            "type": "address"
          }
        ],
        "internalType": "struct MeTokenInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC20 ABI for MeToken
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface MeTokenHolding {
  address: string;
  name: string;
  symbol: string;
  balance: string; // Formatted balance string
  balanceRaw: bigint; // Raw balance for calculations
  totalSupply: bigint;
  tvl: number;
  creatorProfile: CreatorProfile | null;
  ownerAddress: string;
  isOwnMeToken: boolean; // True if this is the user's own MeToken
  hubId: number;
  balancePooled: bigint;
  balanceLocked: bigint;
  startTime: bigint;
  endTime: bigint;
  endCooldown: bigint;
  targetHubId: number;
  migration: boolean;
}

export interface UseMeTokenHoldingsResult {
  holdings: MeTokenHolding[];
  loading: boolean;
  error: string | null;
  totalValue: number; // Total portfolio value
  refreshHoldings: () => Promise<void>;
}

export function useMeTokenHoldings(targetAddress?: string): UseMeTokenHoldingsResult {
  const user = useUser();
  const { client } = useSmartAccountClient({});
  const [holdings, setHoldings] = useState<MeTokenHolding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = targetAddress || user?.address;

  const fetchHoldings = useCallback(async () => {
    if (!address || !client) {
      setHoldings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching MeToken holdings for address:', address);
      
      // Get all MeTokens from subgraph
      const allMeTokens = await meTokensSubgraph.getAllMeTokens(100, 0);
      console.log(`📋 Found ${allMeTokens.length} MeTokens in subgraph`);

      const userHoldings: MeTokenHolding[] = [];

      // Check each MeToken for user's balance
      for (const meToken of allMeTokens) {
        try {
          // Get MeToken info from Diamond contract first
          const info = await client.readContract({
            address: DIAMOND,
            abi: DIAMOND_ABI,
            functionName: 'getMeTokenInfo',
            args: [meToken.id as `0x${string}`],
          }) as any;

          // Get user's balance for this MeToken
          const balance = await client.readContract({
            address: meToken.id as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          }) as bigint;

          // Include MeTokens where user has a balance OR if it's their own MeToken
          const isOwnMeToken = info.owner.toLowerCase() === address.toLowerCase();
          
          // Only include if user has a balance > 0 OR if it's their own MeToken with some activity
          if (balance > 0 || (isOwnMeToken && (info.balancePooled > 0 || info.balanceLocked > 0))) {
            console.log(`💰 Found ${isOwnMeToken ? 'own MeToken' : 'balance'} for ${meToken.id}:`, balance.toString());

            // Get ERC20 token details
            const [name, symbol, totalSupply] = await Promise.all([
              client.readContract({
                address: meToken.id as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'name',
              }),
              client.readContract({
                address: meToken.id as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'symbol',
              }),
              client.readContract({
                address: meToken.id as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'totalSupply',
              }),
            ]);

            // Calculate TVL
            const tvl = calculateTVL(info);

            // Fetch creator profile
            let creatorProfile: CreatorProfile | null = null;
            try {
              creatorProfile = await creatorProfileSupabaseService.getCreatorProfileByOwner(info.owner);
            } catch (profileError) {
              console.warn(`Failed to fetch creator profile for ${info.owner}:`, profileError);
            }

            const holding: MeTokenHolding = {
              address: meToken.id,
              name,
              symbol,
              balance: formatEther(balance),
              balanceRaw: balance,
              totalSupply,
              tvl,
              creatorProfile,
              ownerAddress: info.owner,
              isOwnMeToken,
              hubId: Number(info.hubId),
              balancePooled: BigInt(info.balancePooled || 0),
              balanceLocked: BigInt(info.balanceLocked || 0),
              startTime: BigInt(info.startTime || 0),
              endTime: BigInt(info.endTime || 0),
              endCooldown: BigInt(info.endCooldown || 0),
              targetHubId: Number(info.targetHubId || 0),
              migration: Boolean(info.migration),
            };

            userHoldings.push(holding);
          }
        } catch (tokenError) {
          console.warn(`Failed to check MeToken ${meToken.id}:`, tokenError);
          // Continue checking other MeTokens
        }
      }

      // Sort holdings: own MeToken first, then by balance descending
      userHoldings.sort((a, b) => {
        if (a.isOwnMeToken && !b.isOwnMeToken) return -1;
        if (!a.isOwnMeToken && b.isOwnMeToken) return 1;
        return Number(b.balance) - Number(a.balance);
      });

      console.log(`✅ Found ${userHoldings.length} MeToken holdings`);
      if (userHoldings.length === 0) {
        console.log('📭 No MeToken holdings found for user');
      }
      setHoldings(userHoldings);
    } catch (err) {
      console.error('Error fetching MeToken holdings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch holdings');
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  }, [address, client]);

  // Calculate total portfolio value
  const totalValue = holdings.reduce((sum, holding) => {
    // For now, we'll use TVL as a proxy for value
    // In the future, this could be enhanced with actual market prices
    return sum + (Number(holding.balance) * (holding.tvl / 1000000)); // Rough estimate
  }, 0);

  // Initial fetch (only run once on mount)
  useEffect(() => {
    fetchHoldings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAddress]); // Only re-run when targetAddress changes

  return {
    holdings,
    loading,
    error,
    totalValue,
    refreshHoldings: fetchHoldings,
  };
}

// Helper function to calculate TVL (copied from existing utils)
function calculateTVL(info: any): number {
  const balancePooled = BigInt(info.balancePooled || 0);
  const balanceLocked = BigInt(info.balanceLocked || 0);
  
  // Convert from wei to USD (rough estimate)
  // This should be enhanced with actual price feeds
  const totalBalance = balancePooled + balanceLocked;
  return Number(totalBalance) / 1e18; // Convert from wei to ETH, then to USD estimate
}
