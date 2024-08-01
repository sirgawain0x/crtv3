'use client';
import { ConnectButton } from 'thirdweb/react';
import { client } from '@app/lib/sdk/thirdweb/client';
import { ACCOUNT_FACTORY_ADDRESS } from '@app/lib/utils/context';
import {
  SmartWalletOptions,
  createWallet,
  inAppWallet,
} from 'thirdweb/wallets';
import { sepolia } from 'thirdweb/chains';

export default function ConnectButtonWrapper() {
  const chain = sepolia;
  const smartWalletConfig: SmartWalletOptions = {
    factoryAddress: ACCOUNT_FACTORY_ADDRESS.sepolia,
    chain,
    gasless: true,
  };
  const wallets = [
    inAppWallet({
      auth: {
        options: [
          'farcaster',
          'discord',
          'passkey',
          'phone',
          'apple',
          'google',
          'email',
        ],
      },
    }),
    createWallet('io.metamask'),
    createWallet('com.coinbase.wallet'),
  ];

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
      wallets={wallets}
      chain={chain}
      appMetadata={{
        name: 'Creative TV',
        url: 'https://tv.creativeplatform.xyz',
        description: 'The Stage is Yours',
        logoUrl:
          'https://bafybeiesvinhgaqvr62rj77jbwkazg3w6bhcrsfyg6zyozasaud53nucnm.ipfs.w3s.link/Creative%20TV%20Logo.png',
      }}
      walletConnect={{
        projectId: 'dc6a426a325d62879d4b9c6ef6dcedb1',
      }}
      connectModal={{
        privacyPolicyUrl:
          'https://creativeplatform.xyz/docs/legal/privacy-policy',
        termsOfServiceUrl:
          'https://creativeplatform.xyz/docs/legal/terms-conditions',
        welcomeScreen: {
          img: {
            width: 200,
            height: 200,
            src: 'https://bafybeifvsvranpnmujrpcry6lqssxtyfdvqz64gty4vpkhvcncuqd5uimi.ipfs.w3s.link/logo-tv.gif',
          },
          subtitle: 'The Stage is Yours',
          title: 'Welcome to Creative TV',
        },
      }}
    />
  );
}
