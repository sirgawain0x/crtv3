// import { videoContract } from '@app/lib/sdk/thirdweb/get-contract';
import type { TVideoContract } from '@app/types/nft';
import { reject } from 'lodash';
import { useState } from 'react';
import { sendTransaction } from 'thirdweb';
import { claimTo } from 'thirdweb/extensions/erc1155';
import { useActiveAccount } from 'thirdweb/react';

interface IClaimToError extends Error {
  code?: string;
  message: string;
}

interface IClaimToArgs {
  quantity: number;
  tokenId: number;
  to: string;
  videoContract: TVideoContract;
}
type TClaimProps = {
  videoContract: TVideoContract;
};

function useClaimTo(props: TClaimProps) {
  const activeAccount = useActiveAccount();
  const [error, setError] = useState<IClaimToError>();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClaim = async (args: IClaimToArgs) => {
    const TRANSACTION_TIMEOUT = 30000;

    (Object.keys(args) as (keyof IClaimToArgs)[]).forEach((key) => {
      if (!args[key]) {
        throw new Error(`${key} is required`);
      }
    });

    setIsProcessing(true);

    if (!props.videoContract) {
      throw new Error('NFT contract is undefined!');
    }

    try {
      const transaction = claimTo({
        contract: props.videoContract,
        quantity: BigInt(args.quantity),
        to: args.to,
        tokenId: BigInt(args.tokenId),
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Transaction timeout')),
          TRANSACTION_TIMEOUT,
        );
      });

      const result = await Promise.race([
        sendTransaction({
          transaction,
          account: activeAccount!,
        }),
        timeoutPromise,
      ]) as { transactionHash: string };

      const { transactionHash } = result;

      if (transactionHash) {
        return transactionHash;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err) {
      const claimToError: IClaimToError = {
        name: (err as Error).name,
        message: (err as Error).message,
        code: (err as IClaimToError).code,
      };

      setError(claimToError);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    handleClaim,
    error,
    isProcessing,
  };
}

export default useClaimTo;
