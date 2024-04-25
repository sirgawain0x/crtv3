'use client';
import { ConnectButton } from 'thirdweb/react';
import { client } from '@app/lib/sdk/thirdweb/client';
import { ACCOUNT_FACTORY_ADDRESS } from '@app/lib/utils/context';
import { SmartWalletOptions, createWallet } from 'thirdweb/wallets';
import { sepolia } from 'thirdweb/chains';
import {
  generateAPayload,
  isLoggedIn,
  login,
  logout,
} from '@app/lib/utils/Unlock';

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
      auth={{
        isLoggedIn: async (address) => {
          console.log('checking if logged in!', { address });
          return await isLoggedIn();
        },
        doLogin: async (params) => {
          console.log('logging in!');
          await login(params);
        },
        getLoginPayload: async ({ address }) => generateAPayload({ address }),
        doLogout: async () => {
          console.log('logging out!');
          await logout();
        },
      }}
    />
  );
}
