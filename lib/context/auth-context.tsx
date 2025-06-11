'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  SiweMessage,
  type AuthContextType,
  type AuthState,
  type SiweAuthResult,
} from '@/lib/types/auth';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { generateNonce, SiweMessage as Siwe } from 'siwe';
import { useSmartAccountClient } from '@account-kit/react';
import { createLightAccount } from '@account-kit/smart-contracts';
import { alchemy } from '@account-kit/infra';
import { Orbis } from '@orbisclub/orbis-sdk';
import { useToast } from '@/hooks/use-toast';
import { sepolia } from 'viem/chains';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_STATE: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  error: null,
  address: null,
  siweMessage: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const smartAccountClient = useSmartAccountClient();
  const orbis = new Orbis();

  useEffect(() => {
    if (address) {
      setState((prev) => ({ ...prev, address }));
    } else {
      setState(INITIAL_STATE);
    }
  }, [address]);

  const createSiweMessage = async (address: string) => {
    const message = new Siwe({
      address,
      statement: 'Sign in with Ethereum to access the application.',
      domain: window.location.host,
      uri: window.location.origin,
      version: '1',
      chainId: sepolia.id,
      nonce: generateNonce(),
      issuedAt: new Date().toISOString(),
    });
    return message;
  };

  const authenticateWithSIWE = async (
    address: string,
  ): Promise<SiweAuthResult | null> => {
    try {
      const message = await createSiweMessage(address);
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // In a real app, you would verify this on the backend
      // For now, we'll just return the auth result
      return {
        address: address as `0x${string}`,
        signature,
        nonce: message.nonce,
      };
    } catch (error) {
      console.error('SIWE authentication error:', error);
      return null;
    }
  };

  const connectOrbis = async (): Promise<void> => {
    const orbisRes = await orbis.connect_v2({
      provider: window.ethereum,
      lit: false,
    });

    if (orbisRes.status !== 200) {
      throw new Error('Failed to connect to OrbisDB');
    }
  };

  const checkUnlockMembership = async () => {
    try {
      // Implement Unlock Protocol membership check
      // This would involve checking if the user has the required NFT
      // and potentially redirecting to the Unlock checkout if they don't
      const redirectUri = window.location.origin;
      const clientId = new URL(redirectUri).host;
      const unlockEndpoint = 'https://app.unlock-protocol.com/checkout';
      const unlockAuthUrl = `${unlockEndpoint}?redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&client_id=${encodeURIComponent(clientId)}`;

      // For now, we'll just log the URL
      console.log('Unlock Protocol Authentication URL:', unlockAuthUrl);
    } catch (error) {
      console.error('Unlock membership check error:', error);
    }
  };

  const signIn = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!address) throw new Error('No address found');

      // Authenticate with SIWE
      const siweResult = await authenticateWithSIWE(address);
      if (!siweResult) {
        throw new Error('SIWE authentication failed');
      }

      // Connect to OrbisDB
      await connectOrbis();

      // Check Unlock membership
      await checkUnlockMembership();

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        siweMessage: siweResult as unknown as SiweMessage,
      }));

      toast({
        title: 'Successfully signed in',
        description: 'You are now authenticated with your wallet.',
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));
      toast({
        variant: 'destructive',
        title: 'Authentication failed',
        description: (error as Error).message,
      });
    }
  };

  const signOut = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Disconnect wallet
      disconnect();

      // Disconnect from OrbisDB
      await orbis.logout();

      setState(INITIAL_STATE);

      toast({
        title: 'Successfully signed out',
        description: 'Your wallet has been disconnected.',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));
      toast({
        variant: 'destructive',
        title: 'Sign out failed',
        description: (error as Error).message,
      });
    }
  };

  const upgradeToSmartAccount = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!smartAccountClient) {
        throw new Error('Smart account client not initialized');
      }

      if (!address) {
        throw new Error('No EOA address found');
      }

      // Initialize smart account upgrade
      const upgradeTx = await smartAccountClient.sendUserOperation({
        target: address as `0x${string}`,
        data: '0x', // Add your EIP-7702 upgrade data here
        value: BigInt(0),
      });

      await upgradeTx.wait();

      // Get the smart account address
      const smartAccountAddress = await smartAccountClient.getAddress();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        smartAccountAddress,
      }));

      toast({
        title: 'Account upgraded',
        description: 'Your account has been upgraded to a smart account.',
      });
    } catch (error) {
      console.error('Smart account upgrade error:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));
      toast({
        variant: 'destructive',
        title: 'Upgrade failed',
        description: (error as Error).message,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        upgradeToSmartAccount,
        connectOrbis,
        checkUnlockMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
