"use client";

import { useEffect, useState } from "react";
import { useSmartAccountClient, useUser, useChain } from "@/lib/wallet/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUnits, createPublicClient, http } from "viem";
import { getUsdcTokenContract } from "@/lib/contracts/USDCToken";
import { getDaiTokenContract } from "@/lib/contracts/DAIToken";
import { getUsdsTokenContract } from "@/lib/contracts/USDSToken";
import { getGhoTokenContract } from "@/lib/contracts/GHOToken";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { logger } from '@/lib/utils/logger';
import { getTokenIcon } from '@/lib/utils/token-icons';


interface TokenBalanceData {
  symbol: string;
  balance: string;
  isLoading: boolean;
  error: string | null;
}

// Utility function to format balance with proper precision (without symbol)
function formatBalance(balance: string): string {
  // Convert to number for comparison
  const num = parseFloat(balance);
  if (num <= 0) return "0";
  if (num < 0.000001) return "< 0.000001"; // Very small non-zero

  // For small numbers (less than 1), show up to 6 decimals
  if (num < 1) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0,
      useGrouping: false // Don't use commas for decimals
    }).format(num);
  }

  // For larger numbers, show up to 4 decimals
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
    useGrouping: true
  }).format(num);
}

export function TokenBalance() {
  const { client } = useSmartAccountClient({});
  const user = useUser();
  const { chain } = useChain();
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [daiBalance, setDaiBalance] = useState<bigint | null>(null);
  const [usdsBalance, setUsdsBalance] = useState<bigint | null>(null);
  const [ghoBalance, setGhoBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;

    async function getBalances() {
      if (!isMounted) return;

      // Create a new AbortController for this effect
      abortController = new AbortController();
      const signal = abortController.signal;

      setIsLoading(true);
      setError(null);

      try {
        const address = client?.account?.address || user?.address;
        if (!address || !chain) {
          if (isMounted && !signal.aborted) {
            setEthBalance(null);
            setUsdcBalance(null);
            setDaiBalance(null);
            setIsLoading(false);
          }
          return;
        }

        // Map chain.id to key for token contracts
        let chainKey: keyof typeof import("@/lib/contracts/USDCToken").USDC_TOKEN_ADDRESSES;
        if (chain.id === 8453) chainKey = "base";
        else {
          logger.warn(`Unsupported chain ID: ${chain.id}`);
          if (isMounted && !signal.aborted) {
            setError(`Unsupported chain (ID: ${chain.id})`);
            setEthBalance(null);
            setUsdcBalance(null);
            setDaiBalance(null);
            setIsLoading(false);
          }
          return;
        }

        const publicClient = createPublicClient({
          chain,
          transport: http(),
        });

        // Get ETH balance
        try {
          if (!isMounted || signal.aborted) return;
          const ethBalance = await publicClient.getBalance({
            address: address as `0x${string}`
          });
          if (isMounted && !signal.aborted) {
            setEthBalance(ethBalance);
          }
        } catch (error) {
          if (isMounted && !signal.aborted) {
            logger.error("Error fetching ETH balance:", error);
            setEthBalance(null);
          }
        }

        // ERC-20 balances (Base hub collateral stables)
        const erc20Tokens = [
          { symbol: 'USDC', contract: getUsdcTokenContract(chainKey), setter: setUsdcBalance },
          { symbol: 'DAI', contract: getDaiTokenContract(chainKey), setter: setDaiBalance },
          { symbol: 'USDS', contract: getUsdsTokenContract(chainKey), setter: setUsdsBalance },
          { symbol: 'GHO', contract: getGhoTokenContract(chainKey), setter: setGhoBalance },
        ] as const;

        for (const { contract, setter } of erc20Tokens) {
          try {
            if (!isMounted || signal.aborted) return;
            const balance = (await publicClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            })) as bigint;
            if (isMounted && !signal.aborted) {
              setter(balance);
            }
          } catch (error) {
            if (isMounted && !signal.aborted) {
              logger.error(`Error fetching ${contract.symbol} balance:`, error);
              setter(null);
            }
          }
        }
      } catch (error) {
        if (isMounted && !signal.aborted) {
          logger.error("Error fetching balances:", error);
          setError(error instanceof Error ? error.message : "Unknown error");
          setEthBalance(null);
          setUsdcBalance(null);
          setDaiBalance(null);
        }
      } finally {
        if (isMounted && !signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    getBalances();

    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort("Component unmounted or dependencies changed");
      }
    };
  }, [client, user, chain]);

  const chainId = chain?.id;
  const tokenRows = [
    { symbol: 'ETH', balance: ethBalance, decimals: 18 },
    { symbol: 'USDC', balance: usdcBalance, decimals: 6 },
    { symbol: 'DAI', balance: daiBalance, decimals: 18 },
    { symbol: 'USDS', balance: usdsBalance, decimals: 18 },
    { symbol: 'GHO', balance: ghoBalance, decimals: 18 },
  ] as const;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tokenRows.map(({ symbol }) => (
            <div key={symbol} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image src={getTokenIcon(symbol, chainId)} alt={symbol} width={24} height={24} className="w-6 h-6" />
                <span className="text-sm">{symbol}</span>
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">
            Error loading balances: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tokenRows.map(({ symbol, balance, decimals }) => (
          <div key={symbol} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image src={getTokenIcon(symbol, chainId)} alt={symbol} width={24} height={24} className="w-6 h-6" />
              <span className="text-sm">{symbol}</span>
            </div>
            <span className="text-sm font-medium">
              {balance ? formatBalance(formatUnits(balance, decimals)) : "0"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
