"use client";

import { useEffect, useState } from "react";
import { useSmartAccountClient, useUser } from "@account-kit/react";
import { formatEther } from "viem";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeTokensSupabase, MeTokenData } from "@/lib/hooks/metokens/useMeTokensSupabase";
import { useMeTokenHoldings } from "@/lib/hooks/metokens/useMeTokenHoldings";
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

  // Get the user's MeToken data
  const { userMeToken, loading: meTokenLoading, error: meTokenError } = useMeTokensSupabase();
  
  // Get all MeToken holdings
  const { holdings, loading: holdingsLoading } = useMeTokenHoldings();

  // Determine if user has multiple holdings
  const hasMultipleHoldings = holdings.length > 1 || (holdings.length === 1 && !holdings[0]?.isOwnMeToken);

  // Show portfolio view if user has multiple holdings or specifically requests it
  if (showPortfolio || hasMultipleHoldings) {
    return <MeTokenPortfolio />;
  }

  // Show loading state only on initial load
  if ((isLoading || meTokenLoading || holdingsLoading) && holdings.length === 0 && !userMeToken) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">MeTokens</span>
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
          <span className="text-sm font-medium text-gray-500">MeTokens</span>
        </div>
        <div className="text-xs text-red-500">
          Error loading MeTokens: {error || meTokenError}
        </div>
      </div>
    );
  }

  // Show no MeTokens state - only show this if we're not loading and have no holdings or user MeToken
  if (!isLoading && !meTokenLoading && !holdingsLoading && holdings.length === 0 && !userMeToken) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">MeTokens</span>
        </div>
        <div className="text-xs text-gray-500">
          No MeTokens found
        </div>
      </div>
    );
  }

  // If user has their own MeToken but no holdings (0 balance), show the MeToken
  if (!isLoading && !meTokenLoading && !holdingsLoading && holdings.length === 0 && userMeToken) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">MeTokens</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-blue-500" />
                <span className="text-sm font-medium">{userMeToken.symbol}</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="default" className="text-xs px-1 py-0 bg-primary">
                  <Crown className="h-2 w-2 mr-1" />
                  Yours
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {formatBalance(
                  typeof userMeToken.balance === 'bigint' 
                    ? formatEther(userMeToken.balance) 
                    : (userMeToken.balance || "0"), 
                  userMeToken.symbol
                )}
              </div>
              <div className="text-xs text-gray-500">
                TVL: {formatTVL(userMeToken.tvl)}
              </div>
            </div>
          </div>
          
          {/* Link to profile for MeToken management */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <Link 
              href={`/profile/${scaAddress || user?.address}`}
              className={`flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors`}
            >
              <ExternalLink className="h-3 w-3" />
              Manage MeToken
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show single MeToken balance (simple view)
  const singleHolding = holdings[0];
  
  // Safety check - if no holdings, return empty state
  if (!singleHolding) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">MeTokens</span>
        </div>
        <div className="text-xs text-gray-500">
          No MeTokens found
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">MeTokens</span>
        {holdings.length > 1 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPortfolio(true)}
            className="text-xs h-6 px-2"
          >
            <Wallet className="h-3 w-3 mr-1" />
            View All ({holdings.length})
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-blue-500" />
              <span className="text-sm font-medium">{singleHolding.symbol}</span>
            </div>
            <div className="flex items-center gap-1">
              {singleHolding.isOwnMeToken ? (
                <Badge variant="default" className="text-xs px-1 py-0 bg-primary">
                  <Crown className="h-2 w-2 mr-1" />
                  Yours
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  <Users className="h-2 w-2 mr-1" />
                  Held
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {formatBalance(singleHolding.balance, singleHolding.symbol)}
            </div>
            <div className="text-xs text-gray-500">
              TVL: {formatTVL(singleHolding.tvl)}
            </div>
          </div>
        </div>
        
        {/* Link to profile for MeToken management */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Link 
            href={`/profile/${singleHolding.isOwnMeToken ? (scaAddress || user?.address) : singleHolding.ownerAddress}`}
            className={`flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors`}
          >
            <ExternalLink className="h-3 w-3" />
            {singleHolding.isOwnMeToken ? 'Manage MeToken' : 'View Creator Profile'}
          </Link>
        </div>
      </div>
    </div>
  );
}
