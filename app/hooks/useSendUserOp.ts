import {
  useSmartAccountClient,
  useSendUserOperation,
} from '@account-kit/react';
import { toast } from 'sonner';
import { useCallback } from 'react';

interface UserOperation {
  target: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
}

interface UseSendUserOpOptions {
  onSuccess?: (result: {
    hash: string;
    request: UserOperation;
  }) => void | Promise<void>;
  onError?: (error: Error) => void;
  waitForTxn?: boolean;
}

export function useSendUserOp(options: UseSendUserOpOptions = {}) {
  const { client, isLoading: isClientLoading } = useSmartAccountClient({
    type: 'ModularAccountV2',
  });

  const {
    sendUserOperation,
    isSendingUserOperation,
    error: sendError,
  } = useSendUserOperation({
    client,
    waitForTxn: options.waitForTxn ?? true,
    onSuccess: async (result) => {
      toast.success('Transaction sent successfully', {
        description: `Transaction hash: ${result.hash.slice(0, 6)}...${result.hash.slice(-4)}`,
      });
      await options.onSuccess?.(result);
    },
    onError: (error) => {
      toast.error('Transaction failed', {
        description: error.message,
      });
      options.onError?.(error);
    },
  });

  const send = useCallback(
    async (uo: UserOperation) => {
      if (!client) {
        const error = new Error('Smart account client not initialized');
        toast.error('Transaction failed', {
          description: error.message,
        });
        throw error;
      }

      try {
        return await sendUserOperation({ uo });
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Transaction failed');
        toast.error('Transaction failed', {
          description: error.message,
        });
        throw error;
      }
    },
    [client, sendUserOperation],
  );

  return {
    send,
    isLoading: isClientLoading || isSendingUserOperation,
    error: sendError,
  };
}
