'use client';

import { UserMenu } from '@app/components/Layout/userMenu';
import { client } from '@app/lib/sdk/thirdweb/client';
import Unlock from '@app/lib/utils/Unlock.json';
import { CREATIVE_ADDRESS } from '@app/lib/utils/context';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getContract } from 'thirdweb/contract';
import { prepareContractCall } from 'thirdweb/transaction';
import { toWei } from 'thirdweb/utils';
import { base } from 'thirdweb/chains';
import {
  TransactionButton,
  useActiveAccount,
  useReadContract,
} from 'thirdweb/react';
import { Button } from '../ui/button';
import Link from 'next/link';

interface UserMenuProps {
  closeMenu: () => void;
}

function ClaimLockButton({ closeMenu }: { closeMenu: () => void }) {
  const activeAccount = useActiveAccount();

  const unlockAbi = Unlock.abi;
  const unlockContract = getContract({
    client: client,
    chain: base,
    address: '0xf7c4cd399395d80f9d61fde833849106775269c6',
    // address: CONTRACT_ADDRESS.gateway.base.erc721,
    abi: unlockAbi as any,
  });

  const { data: result, isLoading } = useReadContract({
    contract: unlockContract,
    method: 'getHasValidKey',
    params: [activeAccount?.address],
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!activeAccount || !unlockAbi) return;

    if (result !== undefined) {
      console.log('Valid Membership?', result);
      setSubscribed(result);
    }
  }, [activeAccount, unlockAbi, result]);

  return (
    <div className="mx-auto">
      <div className="my-2 flex flex-row">
        {activeAccount && subscribed === true ? (
          <UserMenu />
        ) : (
          <Link href={'https://memberships.creativeplatform.xyz'}>
            <Button variant={'outline'}>Claim Pass</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
export default ClaimLockButton;
