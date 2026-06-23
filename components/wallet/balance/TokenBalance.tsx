"use client";

import { useEffect } from "react";
import { useSmartAccountClient, useUser, useChain } from "@account-kit/react";
import { formatUnits } from "viem";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { getTokenIcon } from "@/lib/utils/token-icons";
import { useTokenBalances } from "@/lib/hooks/wallet/useTokenBalances";
import { PriceService } from "@/lib/sdk/alchemy/price-service";
import { TOKEN_INFO, type TokenSymbol } from "@/lib/sdk/alchemy/swap-service";

type TokenBalanceProps = {
  /** Refetch when the parent menu becomes visible (e.g. account dropdown opens). */
  isVisible?: boolean;
  /** Increment to force a balance refresh after send/swap. */
  refreshKey?: number;
};

function formatBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num <= 0) return "0";
  if (num < 0.000001) return "< 0.000001";

  if (num < 1) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0,
      useGrouping: false,
    }).format(num);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(num);
}

const TOKEN_ROWS: TokenSymbol[] = ["ETH", "USDC", "DAI", "USDS", "GHO"];

export function TokenBalance({ isVisible, refreshKey = 0 }: TokenBalanceProps) {
  const { client } = useSmartAccountClient({});
  const user = useUser();
  const { chain } = useChain();
  const address = client?.account?.address || user?.address;

  const { balances, prices, isLoading, error, refetch } = useTokenBalances(
    address,
    chain
  );

  useEffect(() => {
    if (isVisible) {
      void refetch();
    }
  }, [isVisible, refetch]);

  useEffect(() => {
    if (refreshKey > 0) {
      void refetch();
    }
  }, [refreshKey, refetch]);

  const chainId = chain?.id;

  const tokenRows = TOKEN_ROWS.map((symbol) => {
    const balance = balances[symbol];
    const decimals = TOKEN_INFO[symbol].decimals;
    const amount =
      balance !== null ? parseFloat(formatUnits(balance, decimals)) : 0;
    const usdValue = amount * (prices[symbol] ?? 0);
    return { symbol, amount, formattedAmount: formatBalance(String(amount)), usdValue };
  });

  const totalUsd = tokenRows.reduce((sum, row) => sum + row.usdValue, 0);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-500">Balances</span>
        <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-2">
          {TOKEN_ROWS.map((symbol) => (
            <div key={symbol} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image
                  src={getTokenIcon(symbol, chainId)}
                  alt={symbol}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="text-sm">{symbol}</span>
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-500">Balances</span>
        <div className="text-sm text-red-500">Error loading balances: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-gray-500">Balances</span>

      <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Total Value</div>
        <div className="text-lg font-semibold">
          {PriceService.formatUSD(totalUsd)}
        </div>
      </div>

      <div className="space-y-1.5">
        {tokenRows.map(({ symbol, formattedAmount, usdValue }) => (
          <div key={symbol} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image
                src={getTokenIcon(symbol, chainId)}
                alt={symbol}
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-sm">{symbol}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{formattedAmount}</div>
              <div className="text-xs text-gray-500">
                {PriceService.formatUSD(usdValue)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
