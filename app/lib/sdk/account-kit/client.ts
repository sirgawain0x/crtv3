import { createPublicClient, http } from 'viem';
import { createConfig } from '@account-kit/react';
import { alchemy, base } from '@account-kit/infra';

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY is required');
}

export const client = createPublicClient({
  chain: base,
  transport: http(),
});

export const config = createConfig({
  transport: alchemy({
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  }),
  chain: base,
  ssr: true,
  enablePopupOauth: true,
});
