"use client";

import { useState, useCallback, useEffect } from "react";
import { useSmartAccountClient } from "@account-kit/react";
import { type Address, type Hex, encodeFunctionData, parseAbi, parseUnits, formatUnits, erc20Abi } from "viem";
import { USDC_TOKEN_ADDRESSES, USDC_TOKEN_DECIMALS } from "@/lib/contracts/USDCToken";
import { DAI_TOKEN_ADDRESSES, DAI_TOKEN_DECIMALS } from "@/lib/contracts/DAIToken";
import { toast } from "sonner";

export type TokenSymbol = 'ETH' | 'USDC' | 'DAI';

const TOKEN_INFO = {
  ETH: { 
    decimals: 18, 
    symbol: "ETH",
    address: null, // Native token
  },
  USDC: { 
    decimals: USDC_TOKEN_DECIMALS, 
    symbol: "USDC",
    address: USDC_TOKEN_ADDRESSES.base,
  },
  DAI: { 
    decimals: DAI_TOKEN_DECIMALS, 
    symbol: "DAI",
    address: DAI_TOKEN_ADDRESSES.base,
  },
} as const;

export interface TipResult {
  txHash: string;
  amount: string;
  token: TokenSymbol;
}

export interface UseVideoTipReturn {
  sendTip: (amount: string, token: TokenSymbol, creatorAddress: string) => Promise<TipResult | null>;
  isTipping: boolean;
  error: Error | null;
  balances: Record<TokenSymbol, string>;
  fetchBalances: () => Promise<void>;
}

/**
 * Hook for sending tips to video creators
 * Supports ETH, USDC, and DAI transfers
 */
export function useVideoTip(): UseVideoTipReturn {
  const [isTipping, setIsTipping] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [balances, setBalances] = useState<Record<TokenSymbol, string>>({
    ETH: '0',
    USDC: '0',
    DAI: '0',
  });

  const { address, client } = useSmartAccountClient({});

  // Fetch token balances
  const fetchBalances = useCallback(async () => {
    if (!address || !client) return;

    try {
      // Get ETH balance
      const ethBalance = await client.getBalance({
        address: address as Address,
      });
      
      // Get USDC balance
      const usdcBalance = await client.readContract({
        address: USDC_TOKEN_ADDRESSES.base as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as Address],
      }) as bigint;
      
      // Get DAI balance
      const daiBalance = await client.readContract({
        address: DAI_TOKEN_ADDRESSES.base as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as Address],
      }) as bigint;

      setBalances({
        ETH: formatUnits(ethBalance, 18),
        USDC: formatUnits(usdcBalance, USDC_TOKEN_DECIMALS),
        DAI: formatUnits(daiBalance, DAI_TOKEN_DECIMALS),
      });
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  }, [address, client]);

  // Send tip to creator
  const sendTip = useCallback(
    async (amount: string, token: TokenSymbol, creatorAddress: string): Promise<TipResult | null> => {
      if (!client || !address) {
        setError(new Error("Wallet not connected"));
        return null;
      }

      // Validate creator address
      if (!creatorAddress || !creatorAddress.startsWith("0x")) {
        setError(new Error("Invalid creator address"));
        return null;
      }

      // Prevent self-tipping
      if (creatorAddress.toLowerCase() === address.toLowerCase()) {
        setError(new Error("You cannot tip yourself"));
        return null;
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setError(new Error("Invalid amount"));
        return null;
      }

      setIsTipping(true);
      setError(null);

      try {
        const tokenInfo = TOKEN_INFO[token];
        
        let operation;
        
        if (token === 'ETH') {
          // Send native ETH
          const valueInWei = parseUnits(amount, tokenInfo.decimals);

          operation = await client.sendUserOperation({
            uo: {
              target: creatorAddress as Address,
              data: "0x" as Hex,
              value: valueInWei,
            },
          });
        } else {
          // Send ERC-20 token (USDC or DAI)
          const tokenAmount = parseUnits(amount, tokenInfo.decimals);
          
          // Encode the transfer calldata
          const transferCalldata = encodeFunctionData({
            abi: parseAbi(["function transfer(address,uint256) returns (bool)"]),
            functionName: "transfer",
            args: [creatorAddress as Address, tokenAmount],
          });

          operation = await client.sendUserOperation({
            uo: {
              target: tokenInfo.address as Address,
              data: transferCalldata as Hex,
              value: BigInt(0), // No native value for ERC-20 transfers
            },
          });
        }

        // Wait for transaction to be mined
        const txHash = await client.waitForUserOperationTransaction({
          hash: operation.hash,
        });

        // Success
        toast.success(`Tip of ${amount} ${token} sent successfully!`);
        
        // Refresh balances
        await fetchBalances();

        return {
          txHash,
          amount,
          token,
        };
      } catch (err) {
        console.error("Error sending tip:", err);
        const errorMsg = err instanceof Error ? err.message : "Failed to send tip";
        setError(new Error(errorMsg));
        toast.error(`Failed to send tip: ${errorMsg}`);
        return null;
      } finally {
        setIsTipping(false);
      }
    },
    [client, address, fetchBalances]
  );

  // Fetch balances on mount and when address changes
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    sendTip,
    isTipping,
    error,
    balances,
    fetchBalances,
  };
}

