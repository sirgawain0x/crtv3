import { useEffect, useState } from 'react';
import { type Address, PublicClient, parseAbi } from 'viem';
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

type UseActiveClaimConditionProps = {
  contractAddress: Address;
  tokenId: bigint;
};

export function useActiveClaimCondition({
  contractAddress,
  tokenId,
}: UseActiveClaimConditionProps) {
  const [activeClaimCondition, setActiveClaimCondition] =
    useState<ClaimCondition>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);

  const publicClient = usePublicClient();

  useEffect(() => {
    let mounted = true;

    const getActiveCC = async () => {
      if (!publicClient) return;

      try {
        setIsLoading(true);
        const data = (await publicClient.readContract({
          address: contractAddress,
          abi: parseAbi([
            'function getActiveClaimCondition(uint256 tokenId) view returns (tuple(uint256 startTime, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))',
          ]),
          functionName: 'getActiveClaimCondition',
          args: [tokenId],
        })) as ClaimCondition;

        if (mounted) {
          setActiveClaimCondition(data);
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

    getActiveCC();

    return () => {
      mounted = false;
    };
  }, [publicClient, contractAddress, tokenId]);

  return {
    data: activeClaimCondition,
    error,
    isLoading,
  };
}
