import type { JsonRpcAccount } from 'viem';
import type { User } from '@account-kit/react';

export type Account = JsonRpcAccount;

export function userToAccount(user: User | null): Account | null {
  if (!user) return null;
  return {
    address: user.address as `0x${string}`,
    type: 'json-rpc',
  } as Account;
}

export function viemToAccount(account: JsonRpcAccount): Account {
  return {
    address: account.address,
    type: 'json-rpc',
  };
}
