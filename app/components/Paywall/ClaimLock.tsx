'use client';
import { useEffect, useState } from 'react';
import {
  TransactionButton,
  useActiveAccount,
  useReadContract,
} from 'thirdweb/react';
import { getContract, prepareContractCall, toTokens, toWei } from 'thirdweb';
import { client } from '@app/lib/sdk/thirdweb/client';
import { polygon } from 'thirdweb/chains';
import { toast } from 'sonner';
import Unlock from '@app/lib/utils/Unlock.json';
import { CREATIVE_ADDRESS } from '@app/lib/utils/context';
import { UserMenu } from '@app/components/Layout/userMenu';
import { Currency } from 'lucide-react';
import { symbol } from 'zod';

interface UserMenuProps {
  closeMenu: () => void;
}

function ClaimLockButton({ closeMenu }: { closeMenu: () => void }) {
  const activeAccount = useActiveAccount();
  const unlockAbi = Unlock.abi;
  const unlockContract = getContract({
    client: client,
    chain: polygon,
    address: '0xb6b645c3e2025cf69983983266d16a0aa323e2b0',
    abi: unlockAbi,
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
          <TransactionButton
            payModal={{
              metadata: {
                name: 'Creator Pass',
                image:
                  'https://bafybeiemndtnhajevhwep7mrzx62slcp6nklpw4zwq3dcqvqugj7tqem44.ipfs.w3s.link/Creator%20Membership%20Pass_both.gif',
              },
              buyWithCrypto: true,
              buyWithFiat: {
                prefillSource: {
                  currency: 'USD',
                },
              },
              purchaseData: {},
              supportedTokens: {
                137: [
                  {
                    address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
                    name: 'USD Coin',
                    symbol: 'USDC',
                    icon: 'https://bafybeidzrdgq3vllhxcza6uvkvecxdumgsgkrq22pm3sqdviujttridkku.ipfs.w3s.link/usd-coin-usdc-logo.png',
                  },
                ],
              },
            }}
            transaction={() => {
              const tx = prepareContractCall({
                contract: unlockContract,
                method: 'purchase',
                params: [
                  [60000000000000000000],
                  [activeAccount?.address],
                  [CREATIVE_ADDRESS],
                  [CREATIVE_ADDRESS],
                  ['0x'],
                ],
                value: toWei('60'),
              });
              return tx;
            }}
            onTransactionConfirmed={() => {
              toast('Transaction Successful');
            }}
            onError={() => {
              toast('Transaction Failed');
            }}
          >
            Claim Pass
          </TransactionButton>
        )}
      </div>
    </div>
  );
}
export default ClaimLockButton;
