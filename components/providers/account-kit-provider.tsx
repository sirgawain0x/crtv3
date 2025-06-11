'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { type Address } from 'viem';
import {
  webSigner,
  createSmartAccount,
  type AccountState,
  chain,
} from '@/lib/account-kit';

interface AccountKitContextType extends AccountState {
  connect: (email: string) => Promise<void>;
  disconnect: () => void;
}

const AccountKitContext = createContext<AccountKitContextType>({
  isConnected: false,
  address: undefined,
  chainId: undefined,
  connect: async () => {},
  disconnect: () => {},
});

export function useAccountKit() {
  return useContext(AccountKitContext);
}

interface AccountKitProviderProps {
  children: ReactNode;
}

export function AccountKitProvider({ children }: AccountKitProviderProps) {
  const [state, setState] = useState<AccountState>({
    isConnected: false,
    address: undefined,
    chainId: undefined,
  });

  const connect = async (email: string) => {
    try {
      // Create and connect the account
      const account = await createSmartAccount();

      setState({
        isConnected: true,
        address: account.address,
        chainId: chain.id,
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      setState({
        isConnected: false,
        address: undefined,
        chainId: undefined,
      });
      throw error;
    }
  };

  const disconnect = () => {
    webSigner.disconnect();
    setState({
      isConnected: false,
      address: undefined,
      chainId: undefined,
    });
  };

  return (
    <AccountKitContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
      }}
    >
      {children}
    </AccountKitContext.Provider>
  );
}
