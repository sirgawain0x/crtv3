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
  const { address, isConnected: isWalletConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [authResult, setAuthResult] = useState<OrbisConnectResult | null>(null);

  // Check if user is already connected
  useEffect(() => {
    async function checkConnection() {
      try {
        const connected = await isUserConnected(address);
        setIsAuthenticated(connected);
        if (connected) {
          const user = await getConnectedUser();
          setAuthResult(user);
        }
      } catch (err) {
        console.error('Error checking Orbis connection:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to check connection'),
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (isWalletConnected && address) {
      checkConnection();
    } else {
      setIsAuthenticated(false);
      setAuthResult(null);
      setIsLoading(false);
    }
  }, [address, isWalletConnected]);

  const connect = useCallback(async () => {
    if (!isWalletConnected || !walletClient) {
      throw new Error('Please connect your wallet first');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Pass the walletClient's provider which has been authenticated by Thirdweb
      const result = await connectUser(walletClient.transport.request);
      setAuthResult(result);
      setIsAuthenticated(true);
      return result;
    } catch (err) {
      console.error('Error connecting to Orbis:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isWalletConnected, walletClient]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await disconnectUser();
      setIsAuthenticated(false);
      setAuthResult(null);
    } catch (err) {
      console.error('Error disconnecting from Orbis:', err);
      setError(err instanceof Error ? err : new Error('Failed to disconnect'));
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
