'use client';
import { ConnectButton } from 'thirdweb/react';
import { client } from '@app/lib/sdk/thirdweb/client';
import { ACCOUNT_FACTORY_ADDRESS } from '@app/lib/utils/context';
import { SmartWalletOptions, createWallet } from 'thirdweb/wallets';
import { sepolia } from 'thirdweb/chains';

export default function ConnectButtonWrapper() {
  const chain = sepolia;
  const smartWalletConfig: SmartWalletOptions = {
    factoryAddress: ACCOUNT_FACTORY_ADDRESS.sepolia,
    chain,
    gasless: true,
  };
  const inAppWallet = createWallet('inApp');

  return (
    <ConnectButton
      client={client}
      connectButton={{
        label: 'Get Started',
        className: 'my-custom-class',
        style: {
          backgroundColor: '#EC407A',
          color: 'white',
          borderRadius: '10px',
        },
      }}
      accountAbstraction={smartWalletConfig}
      wallets={[inAppWallet]}
      chain={chain}
      appMetadata={{
        name: 'Creative TV',
        url: 'https://tv.creativeplatform.xyz',
      }}
    />
  );
}
