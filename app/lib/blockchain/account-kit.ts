import { base } from '@account-kit/infra';
import { AlchemyWebSigner } from '@account-kit/signer';
import { createLightAccount } from '@account-kit/smart-contracts';
import { type Address, http } from 'viem';

// Environment variables
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
if (!ALCHEMY_API_KEY) throw new Error('ALCHEMY_API_KEY is required');

const GAS_MANAGER_POLICY_ID = process.env.NEXT_PUBLIC_GAS_MANAGER_POLICY_ID;

// Chain configuration
export const chain = base;

// Create the web signer
export const webSigner = new AlchemyWebSigner({
  client: {
    connection: {
      apiKey: ALCHEMY_API_KEY,
    },
    iframeConfig: {
      iframeContainerId: 'alchemy-signer-iframe-container',
    },
  },
});

// Function to create a smart account
export async function createSmartAccount() {
  return createLightAccount({
    signer: webSigner,
    chain,
    transport: http(`${chain.rpcUrls.alchemy.http[0]}/${ALCHEMY_API_KEY}`),
  });
}

// Types for account state
export interface AccountState {
  isConnected: boolean;
  address: Address | undefined;
  chainId: number | undefined;
}

// Error types
export class AccountKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountKitError';
  }
}
