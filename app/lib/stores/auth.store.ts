'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  AuthState,
  SiweAuthResult,
  SiweMessage,
  UnlockMembershipStatus,
} from '../types/auth';
import type { OrbisConnectResult } from '@useorbis/db-sdk';
import type { Address } from 'viem';

interface AuthStore {
  // State
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isLoading: boolean;
  siweAuth: SiweAuthResult | null;
  orbisAuth: OrbisConnectResult | null;
  orbisProfile: any | null;
  unlockMembership: UnlockMembershipStatus;
  smartAccountAddress: `0x${string}` | undefined;
  isSmartAccountDeployed: boolean;
  error: Error | null;
  address: Address | null;
  siweMessage: SiweMessage | null;

  // Actions
  updateState: (
    state: Partial<Omit<AuthStore, 'updateState' | 'reset'>>,
  ) => void;
  reset: () => void;
}

const initialState = {
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
} as const;

const createStore = () =>
  create<AuthStore>()(
    persist(
      (set) => ({
        ...initialState,
        updateState: (newState) => set((state) => ({ ...state, ...newState })),
        reset: () => set(initialState),
      }),
      {
        name: 'auth-storage',
        storage: createJSONStorage(() => {
          if (typeof window === 'undefined') {
            return {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            };
          }
          return window.sessionStorage;
        }),
        partialize: (state) => {
          const { updateState, reset, ...rest } = state;
          return rest;
        },
      },
    ),
  );

let store: ReturnType<typeof createStore> | null = null;

export function useAuthStore() {
  if (typeof window === 'undefined') {
    return {
      ...initialState,
      updateState: () => {},
      reset: () => {},
    } as AuthStore;
  }

  if (!store) {
    store = createStore();
  }

  return store();
}
