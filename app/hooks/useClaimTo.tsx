import { useState } from 'react';
import { type Address, type Hash, parseAbi } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';
import { useUser } from '@account-kit/react';
import { userToAccount } from '@app/lib/types/account';

type ClaimToProps = {
  contractAddress: Address;
};

type ClaimToArgs = {
  to: Address;
  tokenId: bigint;
  quantity: bigint;
};

interface ClaimToError extends Error {
  code?: string;
  reason?: string;
}

export function useClaimTo({ contractAddress }: ClaimToProps) {
  const [error, setError] = useState<ClaimToError>();
  const [isLoading, setIsLoading] = useState(false);
  const [hash, setHash] = useState<Hash>();

  const user = useUser();
  const account = userToAccount(user);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const claim = async ({ to, tokenId, quantity }: ClaimToArgs) => {
    if (!contractAddress) {
      throw new Error('No contract address provided');
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

    if (!to) {
      throw new Error('No recipient address provided');
    }

    setError(undefined);
    setIsLoading(true);
    setHash(undefined);

    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: parseAbi([
          'function claimTo(address to, uint256 tokenId, uint256 quantity) returns (uint256)',
        ]),
        functionName: 'claimTo',
        args: [to, tokenId, quantity],
        account: account.address as Address,
      });

      const hash = await walletClient.writeContract(request);
      setHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
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
    hash,
  };
}

export default useClaimTo;
