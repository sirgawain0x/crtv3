import { AlchemyAccountsUIConfig, createConfig } from '@account-kit/react';
import { base, alchemy, optimism } from '@account-kit/infra';
import { QueryClient } from '@tanstack/react-query';
import Image from 'next/image';

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY)
  throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY is required');

if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID)
  throw new Error('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is required');

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: 'flat',
  auth: {
    sections: [
      [{ type: 'email' }],
      [
        { type: 'passkey' },
        {
          type: 'social',
          authProviderId: 'google',
          mode: 'popup',
        },
        {
          type: 'social',
          authProviderId: 'facebook',
          mode: 'popup',
        },
        {
          type: 'social',
          authProviderId: 'twitch',
          mode: 'popup',
        },
      ],
      [
        {
          type: 'external_wallets',
          walletConnect: {
            projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
          },
        },
      ],
    ],
    addPasskeyOnSignup: false,
    header: (
      <Image
        src="https://bafybeigvjlcfxxp6hyv2533txic3ymhitpnut7l4nwqe2aue3bit43g5iq.ipfs.w3s.link/kc7zcnjn8ljld0qmsk3.svg"
        alt="Logo"
        width={50}
        height={50}
        priority
      />
    ),
  },
  supportUrl: process.env.NEXT_PUBLIC_SUPPORT_URL,
};

export const config = createConfig(
  {
    transport: alchemy({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    }),
    chain: base,
    ssr: true,
    enablePopupOauth: true,
    chains: [
      {
        chain: optimism,
      },
      {
        chain: base,
      },
    ],
  },
  uiConfig,
);

export const ACCOUNT_KIT_CONFIG = {
  mode: 'default' as const,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
};

export const queryClient = new QueryClient();
