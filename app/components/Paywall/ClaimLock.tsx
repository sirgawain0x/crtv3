'use client';

import { UserMenu } from '@app/components/Layout/userMenu';
import Unlock from '@app/lib/utils/Unlock.json';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { useAccount } from '@account-kit/react';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const UNLOCK_CONTRACT_ADDRESS = '0xf7c4cd399395d80f9d61fde833849106775269c6';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

interface ClaimLockButtonProps {
  closeMenu: () => void;
}

function ClaimLockButton({ closeMenu }: ClaimLockButtonProps) {
  const { address } = useAccount({ type: 'ModularAccountV2' });
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    async function checkMembership() {
      if (!address) return;

      try {
        const hasValidKey = await publicClient.readContract({
          address: UNLOCK_CONTRACT_ADDRESS,
          abi: Unlock.abi,
          functionName: 'getHasValidKey',
          args: [address],
        });

        setSubscribed(hasValidKey as boolean);
      } catch (error) {
        console.error('Error checking membership:', error);
      }
    }

    checkMembership();
  }, [address]);

  return (
    <div className="mx-auto">
      <div className="my-2 flex flex-row">
        {address && subscribed ? (
          <UserMenu />
        ) : (
          <Link href="https://memberships.creativeplatform.xyz">
            <Button variant="outline">Claim Pass</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default ClaimLockButton;
