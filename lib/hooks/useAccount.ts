import { useCallback, useEffect, useState } from 'react';
import { type Address } from 'viem';
import {
  AccountKitError,
  AccountState,
  createSmartAccount,
  webSigner,
} from '../account-kit';

export function useAccount() {
  const [state, setState] = useState<AccountState>({
    isConnected: false,
    address: undefined,
    chainId: undefined,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create and connect smart account
      const smartAccount = await createSmartAccount();
      const address = smartAccount.address as Address;
      const chainId = smartAccount.chain.id;

      // Update state with connected account
      setState({
        isConnected: true,
        address,
        chainId,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new AccountKitError('Failed to connect account'),
      );
      setState({
        isConnected: false,
        address: undefined,
        chainId: undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Disconnect web signer
      await webSigner.disconnect();

      // Reset state
      setState({
        isConnected: false,
        address: undefined,
        chainId: undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new AccountKitError('Failed to disconnect account'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await webSigner.connected;
        if (isConnected) await connect();
      } catch (err) {
        console.error('Failed to check connection:', err);
      }
    };

    checkConnection();
  }, [connect]);

  return {
    ...state,
    isLoading,
    error,
    connect,
    disconnect,
  };
}

export type UseAccountReturn = ReturnType<typeof useAccount>;
