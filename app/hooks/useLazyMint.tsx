import { useCallback, useState } from 'react';
import { type Address, parseAbi } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';
import { useUser } from '@account-kit/react';
import { userToAccount } from '@app/lib/types/account';

interface LazyMintError extends Error {
  code?: string;
  message: string;
}

interface LazyMintArgs {
  baseURIForTokens: string;
  contractAddress: Address;
}

interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  properties: {
    creatorAddress: string;
    createdAt: number;
  };
}

export function useLazyMint() {
  const user = useUser();
  const account = userToAccount(user);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [error, setError] = useState<LazyMintError>();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLazyMint = useCallback(
    async (args: LazyMintArgs) => {
      // Validate arguments
      if (!args.baseURIForTokens || !args.contractAddress) {
        throw new Error('baseURIForTokens and contractAddress are required');
      }

      if (!account) {
        throw new Error('No active account');
      }

      if (!walletClient) {
        throw new Error('No wallet client');
      }

      if (!publicClient) {
        throw new Error('No public client');
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        // Fetch metadata from URI
        const res = await fetch(args.baseURIForTokens);
        if (!res.ok) {
          throw new Error(`Failed to fetch metadata: ${res.statusText}`);
        }

        const data = await res.json();
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid metadata format');
        }

        const tokenMetadata: TokenMetadata = {
          ...data,
          properties: {
            creatorAddress: account.address,
            createdAt: new Date().getTime(),
          },
        };

        // Prepare contract interaction
        const { request } = await publicClient.simulateContract({
          address: args.contractAddress,
          abi: parseAbi([
            'function lazyMint(uint256 amount, string baseURIForTokens, bytes extraData) returns (uint256 batchId)',
          ]),
          functionName: 'lazyMint',
          args: [BigInt(1), args.baseURIForTokens, '0x'],
          account: account.address as Address,
        });

        // Send transaction
        const hash = await walletClient.writeContract(request);

        // Wait for transaction
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        return {
          hash,
          receipt,
        };
      } catch (err) {
        if (err instanceof Error) {
          const lazyMintError: LazyMintError = {
            name: err.name,
            message: err.message,
            code: (err as LazyMintError).code,
          };
          setError(lazyMintError);
          throw lazyMintError;
        }
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [account, publicClient, walletClient],
  );

  return {
    lazyMint: handleLazyMint,
    error,
    isProcessing,
  };
}
