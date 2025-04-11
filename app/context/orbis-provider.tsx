'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { OrbisDB } from '@useorbis/db-sdk';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { inAppWallet } from 'thirdweb/wallets';
import {
  type OrbisContextType,
  type OrbisConnectResult,
  type OrbisProviderProps,
} from '../types/orbis';

const OrbisContext = createContext<OrbisContextType>({
  orbis: null,
  isConnected: false,
  session: null,
  connect: async () => {},
  disconnect: async () => {},
});

export function useOrbis() {
  return useContext(OrbisContext);
}

export function OrbisProvider({ children }: OrbisProviderProps) {
  const [orbis, setOrbis] = useState<OrbisDB | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<OrbisConnectResult | null>(null);

  useEffect(() => {
    const initOrbis = async () => {
      const orbisInstance = new OrbisDB({
        nodes: [{ url: 'https://node1.orbisdb.xyz' }],
        ceramic: { url: 'https://ceramic.orbisdb.xyz' },
      });
      setOrbis(orbisInstance);

      const connected = await orbisInstance.isUserConnected();
      setIsConnected(!!connected);

      if (connected) {
        const currentSession = await orbisInstance.getConnectedUser();
        setSession(currentSession as OrbisConnectResult);
      }
    };

    initOrbis();
  }, []);

  const connect = async () => {
    if (!orbis) return;

    try {
      const wallet = await inAppWallet().connect();
      const auth = new OrbisEVMAuth({
        signer: wallet,
        chainId: 1,
        provider: wallet.provider,
      });
      const authResult = await orbis.connectUser({ auth });

      setIsConnected(true);
      setSession(authResult as OrbisConnectResult);
    } catch (error) {
      console.error('Failed to connect to OrbisDB:', error);
      throw error;
    }
  };

  const disconnect = async () => {
    if (!orbis) return;

    try {
      await orbis.disconnectUser();
      setIsConnected(false);
      setSession(null);
    } catch (error) {
      console.error('Failed to disconnect from OrbisDB:', error);
      throw error;
    }
  };

  return (
    <OrbisContext.Provider
      value={{
        orbis,
        isConnected,
        session,
        connect,
        disconnect,
      }}
    >
      {children}
    </OrbisContext.Provider>
  );
}
