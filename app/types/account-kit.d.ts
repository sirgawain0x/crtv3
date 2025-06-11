import { Provider } from 'viem';

declare module '@account-kit/react' {
  interface User {
    address: string;
    type: 'eoa' | 'sca';
    getProvider: () => Promise<Provider>;
  }

  interface AuthParams {
    chainId?: number;
    signMessage?: string;
  }

  interface UseAuthenticateOptions {
    onSuccess?: () => void | Promise<void>;
    onError?: (error: Error) => void;
  }

  interface UseAuthenticateResult {
    authenticate: (params?: AuthParams) => Promise<void>;
    authenticateAsync: (params?: AuthParams) => Promise<void>;
    isPending: boolean;
    error: Error | null;
  }

  interface UserOperation {
    target: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
  }

  interface UseSendUserOperationArgs<TEntryPointVersion = any, TAccount = any> {
    client: TAccount;
    waitForTxn?: boolean;
    onSuccess?: (result: {
      hash: string;
      request: UserOperation;
    }) => void | Promise<void>;
    onError?: (error: Error) => void;
  }

  interface UseSendUserOperationResult<
    TEntryPointVersion = any,
    TAccount = any,
  > {
    sendUserOperation: (params: {
      uo: UserOperation;
    }) => Promise<{ hash: string; request: UserOperation }>;
    isSendingUserOperation: boolean;
    error: Error | null;
  }

  interface UseSmartAccountClientResult<
    TEntryPointVersion = any,
    TAccount = any,
  > {
    client: TAccount | undefined;
    isLoading: boolean;
    error: Error | null;
  }

  export function useUser(): User | null;
  export function useAuthenticate(
    options?: UseAuthenticateOptions,
  ): UseAuthenticateResult;
  export function useSendUserOperation<
    TEntryPointVersion = any,
    TAccount = any,
  >(
    args: UseSendUserOperationArgs<TEntryPointVersion, TAccount>,
  ): UseSendUserOperationResult<TEntryPointVersion, TAccount>;
  export function useSmartAccountClient<
    TEntryPointVersion = any,
    TAccount = any,
  >(options?: {
    type?: 'ModularAccountV2';
  }): UseSmartAccountClientResult<TEntryPointVersion, TAccount>;
}
