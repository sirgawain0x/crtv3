import { type Address } from 'viem';

export interface SiweMessage {
  address: Address;
  statement: string;
  chainId: number;
  version: string;
  nonce: string;
  issuedAt: string;
  domain: string;
  uri: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface SiweAuthResult {
  address: Address;
  signature: string;
  nonce: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  address: Address | null;
  siweMessage: SiweMessage | null;
  smartAccountAddress?: Address;
}

export interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  upgradeToSmartAccount: () => Promise<void>;
  connectOrbis: () => Promise<void>;
  checkUnlockMembership: () => Promise<void>;
}

export interface UnlockMembershipStatus {
  isValid: boolean;
  expiration?: number;
  tokenId?: string;
}

export interface OrbisDBProfile {
  did: string;
  details: {
    profile?: {
      username?: string;
      description?: string;
      pfp?: string;
    };
  };
}

export interface SmartAccountConfig {
  chain: {
    id: number;
    name: string;
  };
  transport: any; // Replace with actual transport type from Account Kit
  signer: any; // Replace with actual signer type from Account Kit
  gasManagerPolicyId?: string;
}
