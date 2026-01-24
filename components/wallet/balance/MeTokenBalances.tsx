"use client";

import { useEffect, useState } from "react";
import { useSmartAccountClient, useUser } from "@account-kit/react";
import { formatEther } from "viem";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeTokensSupabase, MeTokenData } from "@/lib/hooks/metokens/useMeTokensSupabase";
import { useMeTokenHoldings, type MeTokenHolding } from "@/lib/hooks/metokens/useMeTokenHoldings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, TrendingUp, Lock, ExternalLink, Wallet, Users, Crown } from "lucide-react";
import Link from "next/link";
import { MeTokenPortfolio } from "./MeTokenPortfolio";

interface MeTokenBalanceData {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  tvl: number;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

// Utility function to format balance with proper precision
function formatBalance(balance: string, symbol: string): string {
  const num = parseFloat(balance);
  if (num === 0) return `0 ${symbol}`;

  // If number is very small (less than 0.00001), use scientific notation
  if (num < 0.00001) return `${num.toExponential(5)} ${symbol}`;

  // For regular numbers, preserve significant digits up to 5 decimal places
  const [integerPart, decimalPart = ""] = balance.split(".");

  // If decimal part is shorter than significant digits, use it as is
  if (decimalPart.length <= 5) {
    const cleanDecimal = decimalPart.replace(/0+$/, "");
    return cleanDecimal
      ? `${integerPart}.${cleanDecimal} ${symbol}`
      : `${integerPart} ${symbol}`;
  }

  // Otherwise, truncate to significant digits and remove trailing zeros
  const truncatedDecimal = decimalPart.slice(0, 5).replace(/0+$/, "");
  return truncatedDecimal
    ? `${integerPart}.${truncatedDecimal} ${symbol}`
    : `${integerPart} ${symbol}`;
}

// Utility function to format TVL
function formatTVL(tvl: number): string {
  if (tvl === 0) return "$0";
  if (tvl < 1000) return `$${tvl.toFixed(2)}`;
  if (tvl < 1000000) return `$${(tvl / 1000).toFixed(1)}K`;
  return `$${(tvl / 1000000).toFixed(1)}M`;
}

export function MeTokenBalances() {
  const { client, address: scaAddress } = useSmartAccountClient({});
  const user = useUser();
  const [meTokenBalances, setMeTokenBalances] = useState<MeTokenBalanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [maxVisibleItems] = useState(3); // Show max 3 items in dropdown, then scroll

  // Get the user's MeToken data
  const { userMeToken, loading: meTokenLoading, error: meTokenError } = useMeTokensSupabase();

  // Get all MeToken holdings
  const { holdings, loading: holdingsLoading } = useMeTokenHoldings();

  // Combine user's own MeToken with holdings for display
  const allMeTokens: MeTokenHolding[] = [
    ...(userMeToken ? [{
      address: userMeToken.address,
      name: userMeToken.name,
      symbol: userMeToken.symbol,
      balance: typeof userMeToken.balance === 'bigint' 
        ? formatEther(userMeToken.balance) 
        : (userMeToken.balance || "0"),
      balanceRaw: typeof userMeToken.balance === 'bigint' ? userMeToken.balance : BigInt(0),
      totalSupply: BigInt(0),
      tvl: userMeToken.tvl,
      creatorProfile: null,
      ownerAddress: scaAddress || user?.address || "",
      isOwnMeToken: true,
      hubId: 0,
      balancePooled: BigInt(0),
      balanceLocked: BigInt(0),
      startTime: BigInt(0),
      endTime: BigInt(0),
      endCooldown: BigInt(0),
      targetHubId: 0,
      migration: false,
    } as MeTokenHolding] : []),
    ...holdings.filter(h => !h.isOwnMeToken || !userMeToken) // Avoid duplicates
  ];

  const totalCount = allMeTokens.length;
  const visibleMeTokens = allMeTokens.slice(0, maxVisibleItems);
  const hasMore = totalCount > maxVisibleItems;

  // Show portfolio view in a dialog/modal if user clicks "View All"
  if (showPortfolio) {
    return <MeTokenPortfolio />;
  }

  // Show loading state only on initial load
  if ((isLoading || meTokenLoading || holdingsLoading) && holdings.length === 0 && !userMeToken) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">MeToken Portfolio</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || meTokenError) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">MeToken Portfolio</span>
        </div>
        <div className="text-xs text-red-500">
          Error loading MeTokens: {error || meTokenError}
        </div>
      </div>
    );
  }

  // Show no MeTokens state
  if (!isLoading && !meTokenLoading && !holdingsLoading && totalCount === 0) {
    return null;
  }

  // Calculate total value
  const totalValue = allMeTokens.reduce((sum, token) => sum + token.tvl, 0);
  const uniqueCreators = new Set(allMeTokens.map(t => t.ownerAddress)).size;

  return (
    <div className="space-y-2">
      {/* Portfolio Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500">MeToken Portfolio</span>
          <span className="text-xs text-gray-400">
            {totalCount} MeToken{totalCount !== 1 ? 's' : ''} • {uniqueCreators} Creator{uniqueCreators !== 1 ? 's' : ''}
          </span>
        </div>
        {totalCount > maxVisibleItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPortfolio(true)}
            className="text-xs h-6 px-2"
          >
            <Wallet className="h-3 w-3 mr-1" />
            View All
          </Button>
        )}
      </div>

      {/* Total Value */}
      <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Total Value</div>
        <div className="text-lg font-semibold">{formatTVL(totalValue)}</div>
      </div>

      {/* Scrollable MeToken List */}
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
        {visibleMeTokens.map((token) => (
          <Link
            key={token.address}
            href={`/profile/${token.isOwnMeToken ? (scaAddress || user?.address) : token.ownerAddress}`}
            className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Coins className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{token.symbol}</span>
                {token.isOwnMeToken ? (
                  <Badge variant="default" className="text-xs px-1 py-0 bg-primary flex-shrink-0">
                    <Crown className="h-2 w-2 mr-0.5" />
                    Yours
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs px-1 py-0 flex-shrink-0">
                    <Users className="h-2 w-2 mr-0.5" />
                    Held
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="text-sm font-medium">
                {formatBalance(token.balance, token.symbol)}
              </div>
              <div className="text-xs text-gray-500">
                {formatTVL(token.tvl)}
              </div>
            </div>
            <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0" />
          </Link>
        ))}
        
        {/* Show more indicator */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPortfolio(true)}
            className="w-full text-xs h-7 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            View {totalCount - maxVisibleItems} more...
          </Button>
        )}
      </div>
    </div>
  );
}
