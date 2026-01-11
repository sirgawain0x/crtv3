/**
 * Client-side x402 Payment Hook
 * 
 * This hook provides x402 payment functionality using the user's connected smart account.
 * x402-fetch requires wallet access to sign transactions, so this must run client-side.
 * 
 * @see https://github.com/x402-protocol/x402-fetch
 */

import { useCallback, useState } from 'react';
import { useSmartAccountClient } from '@account-kit/react';
import { USDC_TOKEN_ADDRESSES, USDC_TOKEN_DECIMALS } from '@/lib/contracts/USDCToken';
import { base } from '@account-kit/infra';

// x402-fetch is currently disabled due to Solana package version conflicts
// The @solana-program/compute-budget package requires isDurableNonceTransaction from @solana/kit
// but the installed version of @solana/kit doesn't export this function.
// TODO: Re-enable when x402-fetch updates its dependencies or @solana/kit is updated
const X402_DISABLED = true;
const X402_DISABLED_MESSAGE = 'x402 payments are temporarily disabled due to a dependency update in progress. Please use alternative payment methods.';

// x402 Payment Configuration for USDC on Base
const X402_CONFIG = {
  chain: base,
  token: {
    address: USDC_TOKEN_ADDRESSES.base as `0x${string}`,
    symbol: 'USDC',
    decimals: USDC_TOKEN_DECIMALS,
  },
  // Default price: 1 USDC (1000000 units due to 6 decimals)
  defaultAmount: '1000000',
} as const;

export interface X402PaymentOptions {
  service: string;
  amount?: string;
  endpoint?: string;
  recipientAddress?: string;
  additionalData?: Record<string, any>;
}

export interface X402PaymentResponse {
  success: boolean;
  paymentResponse?: {
    amount: string;
    amountFormatted: string;
    token: string;
    chain: string;
    service: string;
    timestamp: number;
    transactionHash?: string;
  };
  error?: string;
  data?: any;
}

export function useX402Payment() {
  const { client } = useSmartAccountClient({ type: 'MultiOwnerModularAccount' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPayment, setLastPayment] = useState<X402PaymentResponse | null>(null);

  /**
   * Make an x402 payment using the user's connected smart account
   * 
   * @param options Payment options including service name, amount, and endpoint
   * @returns Payment response with transaction details
   */
  const makePayment = useCallback(async (
    options: X402PaymentOptions
  ): Promise<X402PaymentResponse> => {
    setIsProcessing(true);

    try {
      // Check if client is available
      if (!client) {
        throw new Error('Wallet not connected. Please connect your wallet to make payments.');
      }

      // Check if account is available
      if (!client.account) {
        throw new Error('Smart account not initialized. Please try reconnecting your wallet.');
      }

      const {
        service,
        amount = X402_CONFIG.defaultAmount,
        endpoint = 'https://x402.payai.network/api/base/paid-content',
        recipientAddress,
        additionalData = {},
      } = options;

      // Check if x402 is currently disabled due to dependency conflicts
      if (X402_DISABLED) {
        throw new Error(X402_DISABLED_MESSAGE);
      }

      console.log(`Processing x402 payment for ${service}`);
      console.log(`Amount: ${amount} (${Number(amount) / 10 ** X402_CONFIG.token.decimals} ${X402_CONFIG.token.symbol})`);
      console.log(`Token: ${X402_CONFIG.token.address} on Base`);
      if (recipientAddress) {
        console.log(`Recipient: ${recipientAddress}`);
      }

      // x402-fetch would be loaded and used here when re-enabled
      // For now, this code path is unreachable due to the X402_DISABLED check above
      // When x402 dependencies are fixed, remove the X402_DISABLED check and implement:
      // 1. Dynamic import of x402-fetch
      // 2. wrapFetchWithPayment call
      // 3. Payment request and response handling
      
      // This should never be reached due to the throw above
      const result: X402PaymentResponse = {
        success: false,
        error: X402_DISABLED_MESSAGE,
      };
      setLastPayment(result);
      return result;

    } catch (error) {
      console.error('x402 payment failed:', error);

      const errorResult: X402PaymentResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };

      setLastPayment(errorResult);
      return errorResult;

    } finally {
      setIsProcessing(false);
    }
  }, [client]);

  /**
   * Check if the user has sufficient USDC balance for a payment
   * 
   * @param amount Amount in base units (e.g., 1000000 for 1 USDC)
   * @returns Promise<boolean> indicating if user has sufficient balance
   */
  const checkBalance = useCallback(async (amount: string = X402_CONFIG.defaultAmount): Promise<boolean> => {
    try {
      if (!client) return false;

      // TODO: Implement balance check using viem
      // This would query the USDC token contract for the user's balance
      // For now, return true to allow the payment to proceed
      // The actual payment will fail if insufficient balance
      return true;

    } catch (error) {
      console.error('Balance check failed:', error);
      return false;
    }
  }, [client]);

  return {
    makePayment,
    checkBalance,
    isProcessing,
    lastPayment,
    isConnected: !!client,
    config: X402_CONFIG,
  };
}

