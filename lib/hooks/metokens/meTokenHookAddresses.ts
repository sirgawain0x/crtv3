import { type Address } from 'viem';
import { resolveEvmAddress } from '@/lib/hooks/metokens/resolveEvmAddress';

export function requireMeTokenAddress(input: string): Address {
  const resolved = resolveEvmAddress(input);
  if (!resolved) {
    throw new Error('Invalid MeToken address');
  }
  return resolved;
}
