'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { OrbisConnectResult } from '@useorbis/db-sdk';
import { db } from '@app/lib/sdk/orbisDB/client';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { useDebounce } from '@app/hooks/useDebounce';

interface OrbisUserProfile {
  username?: string;
  description?: string;
  pfp?: string;
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

  // Debounce the auth check to prevent too many requests
  const debouncedAuthCheck = useDebounce(async () => {
    // Skip if we checked recently
    const now = Date.now();
    if (
      authState.lastChecked &&
      now - authState.lastChecked < AUTH_CHECK_INTERVAL
    ) {
      return;
    }

    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
      });

      // If we get a 401, just update the state and return
      if (response.status === 401) {
        setAuthState((prev) => ({
          ...prev,
          isAuthenticated: false,
          isLoading: false,
          user: null,
          orbisData: null,
          lastChecked: now,
        }));
        return;
      }

      const orbisConnected = await db.isUserConnected();
      const orbisResult = orbisConnected ? await db.getConnectedUser() : null;

      // Convert the orbis result to our expected types
      let orbisData: OrbisConnectResult | null = null;
      let user: OrbisUserData | null = null;

      if (
        orbisResult &&
        typeof orbisResult === 'object' &&
        !Array.isArray(orbisResult) &&
        'did' in orbisResult
      ) {
        orbisData = orbisResult as OrbisConnectResult;

        // Only try to construct user if we have valid orbisData
        if (
          orbisData.user &&
          typeof orbisData.user === 'object' &&
          'did' in orbisData.user
        ) {
          const userObj = orbisData.user as OrbisUser;
          const didString = userObj.did.split('did:')[1];
          if (didString) {
            user = {
              address: userObj.address || '',
              did: `did:${didString}` as const,
              details: {
                did: userObj.did,
                address: userObj.address,
                profile: userObj.profile,
              },
            };
          }
        }
      }

      // Update auth state with proper type checking
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: response.ok && orbisConnected,
        isLoading: false,
        user,
        orbisData,
        lastChecked: now,
      }));

      // Only redirect on first load or explicit auth failures
      if (!response.ok && !authState.lastChecked) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        orbisData: null,
        lastChecked: Date.now(),
      }));

      // Only redirect on first load
      if (!authState.lastChecked) {
        router.push('/login');
      }
    }
  }, 1000); // 1 second debounce

  // Run auth check on mount and periodically
  useEffect(() => {
    debouncedAuthCheck();

    // Set up periodic check
    const interval = setInterval(() => {
      if (!authState.isLoading) {
        debouncedAuthCheck();
      }
    }, AUTH_CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [debouncedAuthCheck, authState.isLoading]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
