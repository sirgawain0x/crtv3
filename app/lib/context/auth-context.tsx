'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrbisConnectResult } from '@useorbis/db-sdk';
import { db } from '@app/lib/sdk/orbisDB/client';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    address?: string;
    did?: string;
    details?: any;
  } | null;
  orbisData: OrbisConnectResult | null;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    orbisData: null,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check JWT token
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
      });

      // Check Orbis connection
      const orbisConnected = await db.isUserConnected();
      const orbisUser = orbisConnected ? await db.getConnectedUser() : null;

      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: response.ok && orbisConnected,
        isLoading: false,
        user: orbisUser
          ? {
              address: orbisUser.user?.address,
              did: orbisUser.user?.did,
              details: orbisUser.user,
            }
          : null,
        orbisData: orbisUser,
      }));

      return response.ok && orbisConnected;
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
      }));
      return false;
    }
  };

  const login = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Connect with Orbis using EVM auth
      const auth = new OrbisEVMAuth(window.ethereum);
      const orbisResult = await db.connectUser({ auth });

      if (!orbisResult) {
        throw new Error('Orbis connection failed');
      }

      // Update auth state
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          address: orbisResult.user?.address,
          did: orbisResult.user?.did,
          details: orbisResult.user,
        },
        orbisData: orbisResult,
      });

      // Redirect to dashboard or previous page
      const returnUrl = new URLSearchParams(window.location.search).get('from');
      router.push(returnUrl || '/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Disconnect from Orbis
      await db.disconnectUser();

      // Clear auth state
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        orbisData: null,
      });

      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        checkAuth,
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
