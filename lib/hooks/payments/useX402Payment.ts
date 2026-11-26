/**
 * Client-side x402 Payment Hook
 * 
 * This hook provides x402 payment functionality using the user's connected funding-wallet signer.
 * @x402/fetch uses the connected funding-wallet signer for EIP-3009 authorizations.
 * 
 * @see https://github.com/x402-foundation/x402
 */

import { useCallback, useState, useMemo } from 'react';
import { usePrivySigner } from '@/lib/wallet/react';
import { CREATIVE_TREASURY_ADDRESS, X402_NETWORK } from '@/lib/payments/x402-config';
import { USDC_TOKEN_ADDRESSES, USDC_TOKEN_DECIMALS } from '@/lib/contracts/USDCToken';
import { base, alchemy } from '@account-kit/infra';
import { erc20Abi, createPublicClient } from 'viem';
import { logger } from '@/lib/utils/logger';
import { getAlchemyApiKey } from "@/lib/web3/alchemy-key";

async function loadX402Fetch() {
  const [payments, evm] = await Promise.all([import('@x402/fetch'), import('@x402/evm/exact/client')]);
  return { ...payments, ExactEvmScheme: evm.ExactEvmScheme };
}

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
  const signer = usePrivySigner();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPayment, setLastPayment] = useState<X402PaymentResponse | null>(null);

  // Create a public client for reading contract state
  // SmartAccountClient doesn't reliably expose readContract, so we use a separate PublicClient
  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: base,
      transport: alchemy({
        apiKey: getAlchemyApiKey() as string,
      }),
    });
  }, []);

  /**
   * Make an x402 payment using the user's connected funding-wallet signer
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
      if (!signer) {
        throw new Error('Wallet not connected. Please connect your wallet to make payments.');
      }

      // Check if account is available
      if (!signer.address) {
        throw new Error('Smart account not initialized. Please try reconnecting your wallet.');
      }

      const {
        service,
        amount = X402_CONFIG.defaultAmount,
        endpoint = '/api/payments/x402',
        recipientAddress,
        additionalData = {},
      } = options;

      logger.debug(`Processing x402 payment for ${service}`);
      logger.debug(`Amount: ${amount} (${Number(amount) / 10 ** X402_CONFIG.token.decimals} ${X402_CONFIG.token.symbol})`);
      logger.debug(`Token: ${X402_CONFIG.token.address} on Base`);
      if (recipientAddress) {
        logger.debug(`Recipient: ${recipientAddress}`);
      }

      if (endpoint !== '/api/payments/x402') throw new Error('Use the Creative TV payment endpoint');
      const { wrapFetchWithPayment, decodePaymentResponseHeader, x402Client, ExactEvmScheme } = await loadX402Fetch();
      const paymentClient = new x402Client()
        .register(X402_NETWORK, new ExactEvmScheme(signer))
        .registerPolicy((version, requirements) => version === 2 ? requirements.filter((requirement) =>
          requirement.scheme === 'exact' && requirement.network === X402_NETWORK &&
          requirement.asset.toLowerCase() === X402_CONFIG.token.address.toLowerCase() &&
          requirement.payTo.toLowerCase() === CREATIVE_TREASURY_ADDRESS.toLowerCase() &&
          BigInt(requirement.amount) > 0n && BigInt(requirement.amount) <= BigInt(amount),
        ) : []);
      const fetchWithPayment = wrapFetchWithPayment(fetch, paymentClient);

      // Make the x402 payment request
      const response = await fetchWithPayment(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...additionalData,
          service,
          amount,
          token: X402_CONFIG.token.address,
          chain: 'base',
          recipient: recipientAddress || CREATIVE_TREASURY_ADDRESS,
        }),
      });

      // Decode the payment response from headers
      if (!response.ok) throw new Error(`Payment service returned HTTP ${response.status}`);
      const paymentHeader = response.headers.get('PAYMENT-RESPONSE');
      if (!paymentHeader) {
        throw new Error('No payment response received from server');
      }

      const paymentResponse = decodePaymentResponseHeader(paymentHeader);

      if (!paymentResponse.success || paymentResponse.network !== X402_NETWORK ||
          !/^0x[0-9a-fA-F]{64}$/.test(paymentResponse.transaction)) {
        throw new Error('Payment settlement was not confirmed');
      }

      // Parse the response data
      const data = await response.json().catch(() => null);

      const result: X402PaymentResponse = {
        success: true,
        paymentResponse: {
          amount,
          amountFormatted: `${Number(amount) / 10 ** X402_CONFIG.token.decimals} ${X402_CONFIG.token.symbol}`,
          token: X402_CONFIG.token.address,
          chain: 'base',
          service,
          timestamp: Date.now(),
          transactionHash: paymentResponse.transaction,
        },
        data,
      };

      setLastPayment(result);
      return result;

    } catch (error) {
      logger.error('x402 payment failed:', error);

      const errorResult: X402PaymentResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };

      setLastPayment(errorResult);
      return errorResult;

    } finally {
      setIsProcessing(false);
    }
  }, [signer]);

  /**
   * Check if the user has sufficient USDC balance for a payment
   * 
   * @param amount Amount in base units (e.g., 1000000 for 1 USDC)
   * @returns Promise<boolean> indicating if user has sufficient balance
   */
  const checkBalance = useCallback(async (amount: string = X402_CONFIG.defaultAmount): Promise<boolean> => {
    try {
      if (!signer?.address) {
        logger.debug('Balance check: No client or account address');
        return false;
      }

      const requiredAmount = BigInt(amount);
      const userAddress = signer.address;

      logger.debug('Checking USDC balance', {
        userAddress,
        requiredAmount: amount,
        tokenAddress: X402_CONFIG.token.address,
      });

      // Query USDC balance from contract using PublicClient
      // SmartAccountClient doesn't reliably expose readContract, so we use a separate PublicClient
      const balance = await publicClient.readContract({
        address: X402_CONFIG.token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress],
      }) as bigint;

      logger.debug('USDC balance check result', {
        balance: balance.toString(),
        required: amount,
        sufficient: balance >= requiredAmount,
      });

      return balance >= requiredAmount;

    } catch (error) {
      logger.error('Balance check failed:', error);
      // Return false on error to be safe (payment will fail anyway if balance is insufficient)
      return false;
    }
  }, [signer, publicClient]);

  return {
    makePayment,
    checkBalance,
    isProcessing,
    lastPayment,
    isConnected: !!signer,
    config: X402_CONFIG,
  };
}

