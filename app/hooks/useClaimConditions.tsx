import { useEffect, useState } from 'react';
import { ContractOptions } from 'thirdweb';
import {
  getClaimConditions,
  GetClaimConditionsParams,
} from 'thirdweb/extensions/erc1155';

type ClaimConditionsProps = {
  contract: Readonly<ContractOptions<any, `0x${string}`>>;
} & GetClaimConditionsParams;

export function useClaimConditions(props: ClaimConditionsProps) {
  const [claimConditions, setClaimConditions] = useState<any[]>([]);
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const getConditions = async () => {
      try {
        setIsLoading(true);
        const conditions = await getClaimConditions({
          contract: props.contract,
          tokenId: props.tokenId,
        });

        if (mounted) {
          setClaimConditions(conditions);
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
  }, [props.contract, props.tokenId]);

  return {
    data: claimConditions,
    error,
    isLoading,
  };
}
