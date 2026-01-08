"use client";

import { useEffect, useState } from "react";
import { useSmartAccountClient, useUser, useChain } from "@account-kit/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUnits, createPublicClient, http } from "viem";
import { getUsdcTokenContract } from "@/lib/contracts/USDCToken";
import { getDaiTokenContract } from "@/lib/contracts/DAIToken";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

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
  if (num === 0) return "0";

  // If number is very small (less than 0.00001), use scientific notation
  if (num < 0.00001) return num.toExponential(5);

  // For regular numbers, preserve significant digits up to 5 decimal places
  const [integerPart, decimalPart = ""] = balance.split(".");

  // If decimal part is shorter than significant digits, use it as is
  if (decimalPart.length <= 5) {
    const cleanDecimal = decimalPart.replace(/0+$/, "");
    return cleanDecimal
      ? `${integerPart}.${cleanDecimal}`
      : integerPart;
  }

  // Otherwise, truncate to significant digits and remove trailing zeros
  const truncatedDecimal = decimalPart.slice(0, 5).replace(/0+$/, "");
  return truncatedDecimal
    ? `${integerPart}.${truncatedDecimal}`
    : integerPart;
}

export function TokenBalance() {
  const { client } = useSmartAccountClient({});
  const user = useUser();
  const { chain } = useChain();
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [daiBalance, setDaiBalance] = useState<bigint | null>(null);
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
          console.warn(`Unsupported chain ID: ${chain.id}`);
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
            console.error("Error fetching ETH balance:", error);
            setEthBalance(null);
          }
        }

        // Get USDC balance
        try {
          if (!isMounted || signal.aborted) return;

          const usdcTokenContract = getUsdcTokenContract(chainKey);
          const usdcBalance = (await publicClient.readContract({
            address: usdcTokenContract.address,
            abi: usdcTokenContract.abi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          })) as bigint;
          if (isMounted && !signal.aborted) {
            setUsdcBalance(usdcBalance);
          }
        } catch (error) {
          if (isMounted && !signal.aborted) {
            console.error("Error fetching USDC balance:", error);
            setUsdcBalance(null);
          }
        }

        // Get DAI balance
        try {
          if (!isMounted || signal.aborted) return;

          const daiTokenContract = getDaiTokenContract(chainKey);
          const daiBalance = (await publicClient.readContract({
            address: daiTokenContract.address,
            abi: daiTokenContract.abi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          })) as bigint;
          if (isMounted && !signal.aborted) {
            setDaiBalance(daiBalance);
          }
        } catch (error) {
          if (isMounted && !signal.aborted) {
            console.error("Error fetching DAI balance:", error);
            setDaiBalance(null);
          }
        }
      } catch (error) {
        if (isMounted && !signal.aborted) {
          console.error("Error fetching balances:", error);
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

  // Helper to get token icon based on chain
  const getTokenIcon = (symbol: string) => {
    const isBase = chain?.id === 8453;
    switch (symbol) {
      case "ETH":
        return isBase ? "/images/tokens/ETH_on_Base.svg" : "/images/tokens/eth-logo.svg";
      case "USDC":
        return isBase ? "/images/tokens/USDC_on_Base.svg" : "/images/tokens/usdc-logo.svg";
      case "DAI":
        return isBase ? "/images/tokens/DAI_on_Base.svg" : "/images/tokens/dai-logo.svg";
      default:
        return "/images/tokens/eth-logo.svg";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image
                src={getTokenIcon("ETH")}
                alt="ETH"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <span className="text-sm">ETH</span>
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image
                src={getTokenIcon("USDC")}
                alt="USDC"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <span className="text-sm">USDC</span>
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image
                src={getTokenIcon("DAI")}
                alt="DAI"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <span className="text-sm">DAI</span>
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src={getTokenIcon("ETH")}
              alt="ETH"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span className="text-sm">ETH</span>
          </div>
          <span className="text-sm font-medium">
            {ethBalance
              ? formatBalance(formatUnits(ethBalance, 18))
              : "0"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src={getTokenIcon("USDC")}
              alt="USDC"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span className="text-sm">USDC</span>
          </div>
          <span className="text-sm font-medium">
            {usdcBalance
              ? formatBalance(formatUnits(usdcBalance, 6))
              : "0"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src={getTokenIcon("DAI")}
              alt="DAI"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span className="text-sm">DAI</span>
          </div>
          <span className="text-sm font-medium">
            {daiBalance
              ? formatBalance(formatUnits(daiBalance, 18))
              : "0"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
