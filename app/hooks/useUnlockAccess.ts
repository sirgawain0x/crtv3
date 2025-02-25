'use client';

import { getContract } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { client } from '@app/lib/sdk/thirdweb/client';
import { CONTRACT_ADDRESS } from '@app/lib/utils/context';
import unlockAbi from '@app/lib/utils/Unlock.json';
import { useActiveAccount, useReadContract } from 'thirdweb/react';

export function useUnlockAccess() {
  const activeAccount = useActiveAccount();
  
  const unlockContract = getContract({
    address: CONTRACT_ADDRESS.gateway.base.erc721,
    chain: base,
    client,
    abi: unlockAbi.abi as any,
  });

  const { data: hasValidKey, isLoading } = useReadContract({
    contract: unlockContract,
    method: 'getHasValidKey',
    params: [activeAccount?.address],
  });

  return {
    hasAccess: hasValidKey,
    isLoading,
    address: activeAccount?.address
  };
}
