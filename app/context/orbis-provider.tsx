'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { OrbisDB } from '@useorbis/db-sdk';
import { OrbisKeyDidAuth } from '@useorbis/db-sdk/auth';
import type { OrbisConnectResult as SDKOrbisConnectResult } from '@useorbis/db-sdk';
import {
  type OrbisContextType,
  type OrbisConnectResult,
  type OrbisProviderProps,
} from '../types/orbis';

const OrbisContext = createContext<OrbisContextType>({
  orbis: null,
  isConnected: false,
  session: null,
  connect: async () => undefined,
  disconnect: async () => {},
});

export function useOrbis() {
  return useContext(OrbisContext);
}

// Helper to convert SDK result to our app's format
function convertOrbisResult(result: SDKOrbisConnectResult): OrbisConnectResult {
  return {
    success: true,
    did: result.user.did,
  };
}

export function OrbisProvider({ children }: OrbisProviderProps) {
  const [orbis, setOrbis] = useState<OrbisDB | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<OrbisConnectResult | null>(null);

  useEffect(() => {
    const initOrbis = async () => {
      if (
        !process.env.NEXT_PUBLIC_CERAMIC_NODE_URL ||
        !process.env.NEXT_PUBLIC_ORBIS_NODE_URL ||
        !process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID
      ) {
        console.error('Missing required environment variables for Orbis');
        return;
      }

      // Initialize Orbis
      const orbisInstance = new OrbisDB({
        ceramic: {
          gateway: process.env.NEXT_PUBLIC_CERAMIC_NODE_URL,
        },
        nodes: [
          {
            gateway: process.env.NEXT_PUBLIC_ORBIS_NODE_URL,
            env: process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID,
          },
        ],
      });
      setOrbis(orbisInstance);

      // Check for existing connection
      const connected = await orbisInstance.isUserConnected();
      setIsConnected(!!connected);

      if (connected) {
        const currentSession = await orbisInstance.getConnectedUser();
        if (currentSession) {
          setSession(convertOrbisResult(currentSession));
        }
      }
    };

    initOrbis();
  }, []);

  const connect = async () => {
    if (!orbis) return;

    try {
      // Generate a deterministic seed based on timestamp and random value
      const seedBase = `${Date.now()}-${Math.random()}`;
      const encoder = new TextEncoder();
      const seedData = encoder.encode(seedBase);
      const seedBuffer = await crypto.subtle.digest('SHA-256', seedData);
      const seed = Array.from(new Uint8Array(seedBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Create KeyDID auth
      const auth = await OrbisKeyDidAuth.fromSeed(seed);

      // Connect to Orbis
      const authResult = await orbis.connectUser({ auth });

      if (!authResult) {
        throw new Error('Failed to connect to Orbis');
      }

      const formattedResult = convertOrbisResult(authResult);
      setIsConnected(true);
      setSession(formattedResult);

      // Store the seed for future use
      localStorage.setItem('orbis_seed', seed);

      return formattedResult;
    } catch (error) {
      console.error('Failed to connect to OrbisDB:', error);
      throw error;
    }
  };

  const disconnect = async () => {
    if (!orbis) return;

    try {
      await orbis.disconnectUser();
      localStorage.removeItem('orbis_seed');
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
