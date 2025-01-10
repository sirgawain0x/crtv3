import { ResolvedReturnType } from '@app/types/nft';
import { useEffect, useState } from 'react';
import { ContractOptions } from 'thirdweb';
import {
  getClaimConditions,
  GetClaimConditionsParams,
} from 'thirdweb/extensions/erc1155';

type ClaimConditionsParams = {
  contract: Readonly<ContractOptions<any>>;
} & GetClaimConditionsParams;

type ClaimConditions = ResolvedReturnType<
  ReturnType<typeof getClaimConditions>
>;

export function useClaimConditions(props: ClaimConditionsParams) {
  const [claimConditions, setClaimConditions] = useState<ClaimConditions>([]);
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const getCC = async () => {
      try {
        setIsLoading(true);
        const conditions = await getClaimConditions({
          contract: props.contract,
          tokenId: props.tokenId,
        });

        if (mounted) {
          setClaimConditions([...conditions]);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    getCC();

    return () => {
      mounted = false;
    }
  }, [props.contract, props.tokenId]);

  return {
    data: claimConditions,
    error,
    isLoading,
  };
}
