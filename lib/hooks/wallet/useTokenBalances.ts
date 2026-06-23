"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, http, type Chain } from "viem";
import { getUsdcTokenContract } from "@/lib/contracts/USDCToken";
import { getDaiTokenContract } from "@/lib/contracts/DAIToken";
import { getUsdsTokenContract } from "@/lib/contracts/USDSToken";
import { getGhoTokenContract } from "@/lib/contracts/GHOToken";
import { priceService } from "@/lib/sdk/alchemy/price-service";
import {
  SWAP_UI_TOKENS,
  emptyTokenPrices,
  type TokenSymbol,
} from "@/lib/sdk/alchemy/swap-service";
import { logger } from "@/lib/utils/logger";

export type WalletTokenBalances = Record<TokenSymbol, bigint | null>;

const EMPTY_BALANCES: WalletTokenBalances = {
  ETH: null,
  USDC: null,
  DAI: null,
  USDS: null,
  GHO: null,
};

function getChainKey(
  chainId: number
): keyof typeof import("@/lib/contracts/USDCToken").USDC_TOKEN_ADDRESSES | null {
  if (chainId === 8453) return "base";
  return null;
}

export function useTokenBalances(
  address: string | undefined,
  chain: Chain | undefined
) {
  const [balances, setBalances] = useState<WalletTokenBalances>(EMPTY_BALANCES);
  const [prices, setPrices] =
    useState<Record<TokenSymbol, number>>(emptyTokenPrices());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    const { signal } = abortController;

    setIsLoading(true);
    setError(null);

    if (!address || !chain) {
      setBalances(EMPTY_BALANCES);
      setIsLoading(false);
      return;
    }

    const chainKey = getChainKey(chain.id);
    if (!chainKey) {
      setError(`Unsupported chain (ID: ${chain.id})`);
      setBalances(EMPTY_BALANCES);
      setIsLoading(false);
      return;
    }

    try {
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      const nextBalances: WalletTokenBalances = { ...EMPTY_BALANCES };

      try {
        if (signal.aborted) return;
        nextBalances.ETH = await publicClient.getBalance({
          address: address as `0x${string}`,
        });
      } catch (err) {
        logger.error("Error fetching ETH balance:", err);
      }

      const erc20Tokens = [
        { symbol: "USDC" as const, contract: getUsdcTokenContract(chainKey) },
        { symbol: "DAI" as const, contract: getDaiTokenContract(chainKey) },
        { symbol: "USDS" as const, contract: getUsdsTokenContract(chainKey) },
        { symbol: "GHO" as const, contract: getGhoTokenContract(chainKey) },
      ];

      for (const { symbol, contract } of erc20Tokens) {
        try {
          if (signal.aborted) return;
          nextBalances[symbol] = (await publicClient.readContract({
            address: contract.address,
            abi: contract.abi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          })) as bigint;
        } catch (err) {
          logger.error(`Error fetching ${symbol} balance:`, err);
        }
      }

      if (signal.aborted) return;
      setBalances(nextBalances);

      const tokenPrices = await priceService.getTokenPrices([...SWAP_UI_TOKENS]);
      if (signal.aborted) return;
      setPrices(tokenPrices);
    } catch (err) {
      if (signal.aborted) return;
      logger.error("Error fetching balances:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setBalances(EMPTY_BALANCES);
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [address, chain]);

  useEffect(() => {
    void refetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [refetch]);

  return { balances, prices, isLoading, error, refetch };
}
