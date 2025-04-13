'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth.store';
import type { SiweAuthResult } from '../types/auth';
import { signIn, signOut } from '../actions/auth';
import { toast } from 'sonner';

interface UseAuthOptions {
  redirectTo?: string;
  onError?: (error: Error) => void;
}

export function useAuth(options: UseAuthOptions = {}) {
  const router = useRouter();
  const store = useAuthStore();
  const { updateState } = store;

  const handleError = useCallback(
    (error: Error) => {
      updateState({ error });
      options.onError?.(error);
      toast.error('Authentication error', {
        description: error.message,
      });
    },
    [updateState, options],
  );

  const handleSignIn = useCallback(
    async (siweResult: SiweAuthResult) => {
      try {
        updateState({ isAuthenticating: true, error: null });

        const result = await signIn({
          address: siweResult.address,
          signature: siweResult.signature,
          nonce: siweResult.nonce,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        updateState({
          siweAuth: siweResult,
          isAuthenticated: true,
          isAuthenticating: false,
          address: result.data?.address as `0x${string}`,
        });

        toast.success('Successfully signed in');

        if (options.redirectTo) router.push(options.redirectTo);
      } catch (error) {
        updateState({ isAuthenticating: false });
        handleError(error as Error);
      }
    },
    [updateState, router, options.redirectTo, handleError],
  );

  const handleSignOut = useCallback(async () => {
    try {
      updateState({ isAuthenticating: true, error: null });

      const result = await signOut();

      if (!result.success) {
        throw new Error(result.error);
      }

      updateState({
        isAuthenticated: false,
        isAuthenticating: false,
        siweAuth: null,
        orbisAuth: null,
        orbisProfile: null,
        unlockMembership: {
          isValid: false,
        },
        smartAccountAddress: undefined,
        isSmartAccountDeployed: false,
        error: null,
        address: null,
        siweMessage: null,
      });

      toast.success('Successfully signed out');
      router.push('/');
    } catch (error) {
      updateState({ isAuthenticating: false });
      handleError(error as Error);
    }
  }, [updateState, router, handleError]);

  // Return only the state values and action handlers
  const {
    isAuthenticated,
    isLoading,
    error,
    address,
    siweMessage,
    isAuthenticating,
    siweAuth,
    orbisAuth,
    orbisProfile,
    unlockMembership,
    smartAccountAddress,
    isSmartAccountDeployed,
  } = store;

  return {
    isAuthenticated,
    isLoading,
    error,
    address,
    siweMessage,
    isAuthenticating,
    siweAuth,
    orbisAuth,
    orbisProfile,
    unlockMembership,
    smartAccountAddress,
    isSmartAccountDeployed,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
