import { useCallback, useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import {
  db,
  connectUser,
  isUserConnected,
  disconnectUser,
  getConnectedUser,
} from '@app/lib/sdk/orbisDB/client';
import type { OrbisConnectResult } from '@useorbis/db-sdk';

interface UseOrbisAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  authResult: OrbisConnectResult | null;
  connect: () => Promise<OrbisConnectResult>;
  disconnect: () => Promise<void>;
  error: Error | null;
}

export function useOrbisAuth(): UseOrbisAuthReturn {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authResult, setAuthResult] = useState<OrbisConnectResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);
        const connected = await isUserConnected(address);
        setIsAuthenticated(connected);

        if (connected) {
          const result = await getConnectedUser();
          if (
            result &&
            typeof result === 'object' &&
            !Array.isArray(result) &&
            'did' in result
          ) {
            setAuthResult(result as OrbisConnectResult);
          } else {
            setAuthResult(null);
          }
        } else {
          setAuthResult(null);
        }
      } catch (err) {
        console.error('Error checking Orbis connection:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to check connection'),
        );
        setAuthResult(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (address && walletClient) {
      checkConnection();
    } else {
      setAuthResult(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [address, walletClient]);

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!walletClient) {
        throw new Error('No wallet client available');
      }

      const result = await connectUser(walletClient);
      if (!result || typeof result !== 'object' || !('did' in result)) {
        throw new Error('Invalid connection result');
      }

      const orbisResult = result as OrbisConnectResult;
      setAuthResult(orbisResult);
      setIsAuthenticated(true);
      return orbisResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect');
      setError(error);
      setAuthResult(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient]);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await disconnectUser();
      setAuthResult(null);
      setIsAuthenticated(false);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to disconnect');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    authResult,
    connect,
    disconnect,
    error,
  };
}
