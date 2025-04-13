import { type Chain } from 'viem';
import { type AlchemyTransport } from '@account-kit/infra';
import { cookieStorage } from '@account-kit/core';
import { alchemy, base } from '@account-kit/infra';
import { QueryClient } from '@tanstack/react-query';
import { type AlchemyAccountsUIConfig, createConfig } from '@account-kit/react';
import { HeaderLogo } from '@app/components/HeaderLogo';

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY is required');
}

if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
  throw new Error('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is required');
}

const STORAGE_KEY = 'alchemy-account-state';

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: 'flat',
  auth: {
    sections: [
      [{ type: 'email' }],
      [
        { type: 'passkey' },
        { type: 'social', authProviderId: 'google', mode: 'popup' },
        { type: 'social', authProviderId: 'facebook', mode: 'popup' },
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
    addPasskeyOnSignup: true,
    hideSignInText: false,
    header: HeaderLogo,
  },
  supportUrl: 'https://feedback.creativeplatform.xyz',
};

export const config = createConfig(
  {
    transport: alchemy({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY }),
    chain: base,
    ssr: true,
    storage: () => cookieStorage({ domain: process.env.NEXT_PUBLIC_DOMAIN }),
    enablePopupOauth: true,
    sessionConfig: {
      expirationTimeMs: 1000 * 60 * 60,
    },
  },
  uiConfig,
);

export const queryClient = new QueryClient();
