import { type User } from '@account-kit/react';
import { type Account as ViemAccount } from 'viem';

export interface Account {
  address: string;
  type: 'eoa' | 'sca';
}

export function userToAccount(user: User | null): Account | null {
  if (!user) return null;

  return {
    address: user.address,
    type: user.type,
  };
}

export function viemToAccount(account: ViemAccount): Account {
  return {
    address: account.address,
    type: 'eoa',
  };
}
