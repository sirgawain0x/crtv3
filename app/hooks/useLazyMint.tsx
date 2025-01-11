import { videoContract } from '@app/lib/sdk/thirdweb/get-contract';
import { useCallback, useState } from 'react';
import { sendTransaction } from 'thirdweb';
import { lazyMint } from 'thirdweb/extensions/erc1155';
import { useActiveAccount } from 'thirdweb/react';

interface LazyMintError extends Error {
  code?: string;
  message: string;
}

interface LazyMintArgs {
  baseURIForTokens: string;
}

function useLazyMint() {
  const activeAccount = useActiveAccount();
  const [error, setError] = useState<LazyMintError>();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLazyMint = useCallback(
    async (args: LazyMintArgs) => {
      (Object.keys(args) as (keyof LazyMintArgs)[]).forEach((key) => {
        if (!args[key]) {
          throw new Error(`${key} is required`);
        }
      });

      if (!activeAccount) {
        throw new Error('No Active Account connected');
      }

      setIsProcessing(true);

      try {
        const res = await fetch(args.baseURIForTokens);
        if (!res.ok) {
          throw new Error(`Failed to fetch metadata: ${res.statusText}`);
        }

        const data = await res.json();
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid metadata format');
        }

        const tknMetadata = {
          ...data,
          properties: {
            creatorAddress: activeAccount.address,
            createdAt: new Date().getTime(),
          },
        };

        console.log({ tknMetadata });

        const transaction = lazyMint({
          contract: videoContract,
          nfts: [tknMetadata],
        });

        const { transactionHash } = await sendTransaction({
          transaction,
          account: activeAccount,
        });

        if (transactionHash) {
          return transactionHash;
        } else {
          throw new Error('Transaction failed');
        }
      } catch (err) {
        if (err instanceof Error) {
          const lazyMintError: LazyMintError = {
            name: err.name,
            message: err.message,
            code: (err as LazyMintError).code,
          };

          setError(lazyMintError);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [activeAccount],
  );

  return {
    handleLazyMint,
    error,
    isProcessing,
  };
}

export default useLazyMint;
