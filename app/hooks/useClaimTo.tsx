import { useState } from 'react';
import { ContractOptions } from 'thirdweb';
import { claimTo } from 'thirdweb/extensions/erc1155';
import { sendAndConfirmTransaction } from 'thirdweb';
import { useActiveAccount } from 'thirdweb/react';

type ClaimToProps = {
  videoContract: Readonly<ContractOptions<any, `0x${string}`>>;
};

type ClaimToArgs = {
  to: string;
  tokenId: string | number;
  quantity: string | number;
};

interface ClaimToError extends Error {
  code?: string;
  reason?: string;
}

export function useClaimTo(props: ClaimToProps) {
  const [error, setError] = useState<ClaimToError>();
  const [isLoading, setIsLoading] = useState(false);
  const activeAccount = useActiveAccount();

  const claim = async (args: ClaimToArgs) => {
    if (!props.videoContract) {
      throw new Error('No video contract provided');
    }

    if (!activeAccount) {
      throw new Error('No active account');
    }

    if (!args.to) {
      throw new Error('No recipient address provided');
    }

    if (!args.tokenId) {
      throw new Error('No token ID provided');
    }

    if (!args.quantity) {
      throw new Error('No quantity provided');
    }

    setError(undefined);
    setIsLoading(true);

    try {
      const transaction = claimTo({
        contract: props.videoContract,
        quantity: BigInt(args.quantity),
        to: args.to,
        tokenId: BigInt(args.tokenId),
      });

      const receipt = await sendAndConfirmTransaction({
        transaction,
        account: activeAccount,
      });

      return receipt;
    } catch (err) {
      const error = err as ClaimToError;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    claim,
    error,
    isLoading,
  };
}

export default useClaimTo;
