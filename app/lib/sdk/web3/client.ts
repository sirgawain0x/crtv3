import { createPublicClient, http } from 'viem';
import { createConfig } from '@account-kit/react';
import { alchemy, base } from '@account-kit/infra';
import type { AlchemyAccountsUIConfig } from '@account-kit/react';

export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: 'linear',
  auth: {
    sections: [[{ type: 'email' }], [{ type: 'passkey' }]],
    addPasskeyOnSignup: true,
  },
};

export const config = createConfig(
  {
    transport: alchemy({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY! }),
    chain: base,
    ssr: true,
  },
  uiConfig,
);

/**
 * Shortens an Ethereum address to a displayable format
 * @param address - The Ethereum address to shorten
 * @returns The shortened address
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Resolves an ENS name for an address
 * @param address - The Ethereum address to resolve
 * @returns Promise<string> - The ENS name or the shortened address
 */
export async function resolveEnsName(address: string): Promise<string> {
  try {
    const ensName = await publicClient.getEnsName({
      address: address as `0x${string}`,
    });
    return ensName || shortenAddress(address);
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    return shortenAddress(address);
  }
}
