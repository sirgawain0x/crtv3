import { createModularAccountV2Client } from '@account-kit/smart-contracts';
import { LocalAccountSigner } from '@aa-sdk/core';
import {
  base,
  alchemy,
  createAlchemyPublicRpcClient,
} from '@account-kit/infra';
import { type Address, type Hash } from 'viem';
import { generatePrivateKey } from 'viem/accounts';

// Types
export interface SmartAccountConfig {
  mode?: 'default' | '7702';
  chainId?: number;
  alchemyApiKey: string;
}

const baseWithAlchemyUrls = {
  ...base,
  rpcUrls: {
    ...base.rpcUrls,
    default: {
      http: [
        `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
      ],
      webSocket: [
        `wss://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
      ],
    },
  },
} as const;

export interface UserOperationRequest {
  target: Address;
  data: `0x${string}`;
  value: bigint;
}

export interface UserOperationResponse {
  hash: Hash;
  sender: Address;
  success: boolean;
}

// Error types
export class SmartAccountError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'SmartAccountError';
  }
}

// Service implementation
export class SmartAccountService {
  private client: Awaited<
    ReturnType<typeof createModularAccountV2Client>
  > | null = null;
  private config: SmartAccountConfig;

  constructor(config: SmartAccountConfig) {
    this.config = config;
  }

  async initialize() {
    if (this.client) return this.client;

    try {
      this.client = await createModularAccountV2Client({
        mode: this.config.mode || 'default',
        chain: baseWithAlchemyUrls,
        transport: alchemy({ apiKey: this.config.alchemyApiKey }),
        signer:
          LocalAccountSigner.privateKeyToAccountSigner(generatePrivateKey()),
      });

      return this.client;
    } catch (error) {
      throw new SmartAccountError(
        'Failed to initialize smart account client',
        error,
      );
    }
  }

  async sendUserOperation(
    operation: UserOperationRequest,
  ): Promise<UserOperationResponse> {
    try {
      // Ensure client is initialized
      const client = await this.initialize();

      // Send operation
      const result = await client.sendUserOperation({
        uo: {
          target: operation.target,
          data: operation.data,
          value: operation.value,
        },
      });

      return {
        hash: result.hash,
        sender: result.request.sender,
        success: true,
      };
    } catch (error) {
      throw new SmartAccountError('Failed to send user operation', error);
    }
  }

  async getAccountAddress(): Promise<Address> {
    try {
      const client = await this.initialize();
      return client.account.address;
    } catch (error) {
      throw new SmartAccountError('Failed to get account address', error);
    }
  }
}

// Hook for React components
export function useSmartAccount(config: SmartAccountConfig) {
  const service = new SmartAccountService(config);

  return {
    sendOperation: async (operation: UserOperationRequest) => {
      return service.sendUserOperation(operation);
    },
    getAddress: async () => {
      return service.getAccountAddress();
    },
  };
}
