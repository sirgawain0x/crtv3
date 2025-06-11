'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAuthStore } from '../../lib/stores/auth.store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { setState } = useAuthStore();

  useEffect(() => {
    if (address) {
      setState({
        address: address as `0x${string}`,
      });
    } else {
      setState({
        isAuthenticated: false,
        isAuthenticating: false,
        isLoading: false,
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
    }
  }, [address, setState]);

  return children;
}
