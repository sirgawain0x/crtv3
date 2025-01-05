// import { videoContract } from '@app/lib/sdk/thirdweb/get-contract';
import type { TVideoContract } from '@app/types/nft';
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
    (Object.keys(args) as (keyof IClaimToArgs)[]).forEach((key) => {
      if (!args[key]) {
        throw new Error(`${key} is required`);
      }
    });

    setIsProcessing(true);

    try {
      console.log({ args });

      const transaction = claimTo({
        contract: props.videoContract!,
        quantity: BigInt(args.quantity),
        to: args.to,
        tokenId: BigInt(args.tokenId),
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account: activeAccount!,
      });

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
