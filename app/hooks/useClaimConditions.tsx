import { useEffect, useState } from 'react';
import { type Address, parseAbi, PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export type ClaimCondition = {
  startTime: bigint;
  maxClaimableSupply: bigint;
  supplyClaimed: bigint;
  quantityLimitPerWallet: bigint;
  merkleRoot: `0x${string}`;
  pricePerToken: bigint;
  currency: Address;
  metadata: string;
};

type ClaimConditionsProps = {
  contractAddress: Address;
  tokenId: bigint;
};

export function useClaimConditions({
  contractAddress,
  tokenId,
}: ClaimConditionsProps) {
  const [claimConditions, setClaimConditions] = useState<ClaimCondition[]>([]);
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);

  const publicClient = usePublicClient();

  useEffect(() => {
    let mounted = true;

    const getConditions = async () => {
      if (!publicClient) return;

      try {
        setIsLoading(true);
        const data = (await publicClient.readContract({
          address: contractAddress,
          abi: parseAbi([
            'function getClaimConditions(uint256 tokenId) view returns (tuple(uint256 startTime, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata)[])',
          ]),
          functionName: 'getClaimConditions',
          args: [tokenId],
        })) as ClaimCondition[];

        if (mounted) {
          setClaimConditions(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    getConditions();

    return () => {
      mounted = false;
    };
  }, [publicClient, contractAddress, tokenId]);

  return {
    data: claimConditions,
    error,
    isLoading,
  };
}
