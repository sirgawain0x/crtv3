'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { OrbisConnectResult } from '@useorbis/db-sdk';
import { useDebounce } from '@app/hooks/useDebounce';
import { checkAuth } from '@app/lib/actions/auth';
import { useQueryClient } from '@tanstack/react-query';

interface OrbisUserProfile {
  username?: string;
  description?: string;
  pfp?: string;
}

interface AuthUserInformation {
  did: string;
  address?: string;
  profile?: OrbisUserProfile;
}

interface OrbisUser {
  address?: string;
  did: string;
  profile?: OrbisUserProfile;
}

interface OrbisUserData {
  address: string;
  did: `did:${string}`;
  details: OrbisUser;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: OrbisUserData | null;
  orbisData: OrbisConnectResult | null;
  lastChecked?: number;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  orbisData: null,
};

const AUTH_CHECK_INTERVAL = 30000; // 30 seconds
const AuthContext = createContext<AuthState>(initialState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const router = useRouter();
  const queryClient = useQueryClient();

  const updateAuthState = useCallback(
    (updates: Partial<AuthState>) => {
      setAuthState((prev) => ({
        ...prev,
        ...updates,
      }));
      // Invalidate relevant queries when auth state changes
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    [queryClient],
  );

  const debouncedAuthCheck = useDebounce(async () => {
    const now = Date.now();
    if (
      authState.lastChecked &&
      now - authState.lastChecked < AUTH_CHECK_INTERVAL
    ) {
      return;
    }

    try {
      const authResponse = await checkAuth();

      if (!authResponse.ok) {
        updateAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          orbisData: null,
          lastChecked: now,
        });

        if (!authState.lastChecked) {
          router.push('/login');
        }
        return;
      }

      let user: OrbisUserData | null = null;
      if (authResponse.orbisData && 'did' in authResponse.orbisData) {
        const orbisUser = authResponse.orbisData.user as OrbisUser;
        if (orbisUser && 'did' in orbisUser) {
          const didString = orbisUser.did.split('did:')[1];
          if (didString) {
            user = {
              address: orbisUser.address || '',
              did: `did:${didString}` as const,
              details: {
                did: orbisUser.did,
                address: orbisUser.address,
                profile: orbisUser.profile,
              },
            };
          }
        }
      }

      updateAuthState({
        isAuthenticated: authResponse.ok && authResponse.orbisConnected,
        isLoading: false,
        user,
        orbisData: authResponse.orbisData,
        lastChecked: now,
      });

      if (!authResponse.ok && !authState.lastChecked) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      updateAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        orbisData: null,
        lastChecked: now,
      });

      if (!authState.lastChecked) {
        router.push('/login');
      }
    }
  }, 1000);

  useEffect(() => {
    debouncedAuthCheck();

    const interval = setInterval(() => {
      if (authState.isAuthenticated || authState.isLoading) {
        debouncedAuthCheck();
      }
    }, AUTH_CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [debouncedAuthCheck, authState.isLoading, authState.isAuthenticated]);

  const contextValue = useMemo(
    () => ({
      ...authState,
    }),
    [authState],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
