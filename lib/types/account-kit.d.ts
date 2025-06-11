import { type Address, type Chain, type Transport } from 'viem';
import { type Config } from '@wagmi/core';
import { type SmartAccountClient } from '@account-kit/sdk';

export interface UserOperation {
  target: Address;
  data: `0x${string}`;
  value?: bigint;
}

export interface UseSmartAccountClientResult<
  TTransport extends Transport = Transport,
  TChain extends Chain = Chain,
> {
  data: SmartAccountClient<TTransport, TChain> | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  sendUserOperation: (operation: UserOperation) => Promise<`0x${string}`>;
  getAddress: () => Promise<Address>;
}

export interface AccountKitProviderProps {
  config: Config;
  children: React.ReactNode;
}

export declare function AccountKitProvider(
  props: AccountKitProviderProps,
): JSX.Element;

export declare function useSmartAccountClient<
  TTransport extends Transport = Transport,
  TChain extends Chain = Chain,
>(): UseSmartAccountClientResult<TTransport, TChain>;
