import { type Chain } from 'viem';
import { cookieStorage } from '@account-kit/core';
import { alchemy, base } from '@account-kit/infra';
import { type AlchemyAccountsUIConfig, createConfig } from '@account-kit/react';

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY is required');
}

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: 'flat',
  auth: {
    sections: [[{ type: 'email' }], [{ type: 'passkey' }]],
    addPasskeyOnSignup: true,
    hideSignInText: false,
  },
};

export const config = createConfig(
  {
    transport: alchemy({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY }),
    chain: base,
    ssr: true,
    storage: () => cookieStorage(),
    enablePopupOauth: true,
    sessionConfig: {
      expirationTimeMs: 1000 * 60 * 60, // 1 hour
    },
  },
  uiConfig,
);
