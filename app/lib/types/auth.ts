import type { OrbisConnectResult } from '@useorbis/db-sdk';
import type { Address } from 'viem';

export interface SiweMessage {
  address: `0x${string}`;
  chainId: number;
  message: string;
  signature: string;
  nonce: string;
}

export type SiweAuthResult = {
  address: `0x${string}`;
  signature: string;
  nonce: string;
};

export interface UnlockMembershipStatus {
  isValid: boolean;
  expiration?: number;
  tokenId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  siweAuth: SiweAuthResult | null;
  orbisAuth: OrbisConnectResult | null;
  orbisProfile: any | null;
  unlockMembership: UnlockMembershipStatus;
  smartAccountAddress: `0x${string}` | undefined;
  isSmartAccountDeployed: boolean;
  error: Error | null;
  address: Address | null;
  siweMessage: SiweMessage | null;
}
