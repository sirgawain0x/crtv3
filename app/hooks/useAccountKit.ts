import { useCallback } from 'react';
import {
  useAccount,
  useAuthModal,
  useAuthenticate,
  useLogout,
  type AuthParams,
} from '@account-kit/react';
import { toast } from 'sonner';

interface UseAccountKitAuthReturn {
  address: string | undefined;
  isLoading: boolean;
  error: Error | null;
  connectWithEmail: (email: string) => Promise<void>;
  connectWithGoogle: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useAccountKitAuth(): UseAccountKitAuthReturn {
  const { address, account, isLoadingAccount } = useAccount({
    type: 'ModularAccountV2',
  });
  const { openAuthModal } = useAuthModal();
  const { authenticate, isPending, error } = useAuthenticate({
    onSuccess: () => {
      toast.success('Connected successfully');
    },
    onError: (error) => toast.error(error.message),
  });
  const { logout, isLoggingOut } = useLogout({
    onSuccess: () => {
      toast.success('Logged out');
    },
    onError: (error) => toast.error(error.message),
  });

  const connectWithEmail = useCallback(
    async (email: string) => {
      try {
        authenticate({ emailAddress: email } as AuthParams);
      } catch (err) {
        console.error('Failed to connect with email:', err);
      }
    },
    [authenticate],
  );

  const connectWithGoogle = useCallback(async () => {
    try {
      openAuthModal();
    } catch (err) {
      console.error('Failed to connect with Google:', err);
    }
  }, [openAuthModal]);

  const disconnect = useCallback(async () => {
    try {
      logout();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }, [logout]);

  return {
    address,
    isLoading: isLoadingAccount || isPending || isLoggingOut,
    error,
    connectWithEmail,
    connectWithGoogle,
    disconnect,
  };
}
