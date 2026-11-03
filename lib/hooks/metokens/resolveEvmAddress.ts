import { getAddress, isAddress, type Address } from 'viem';

/** Validates external address strings (Supabase, subgraph, user input) for viem calls. */
export function resolveEvmAddress(
  input: string | null | undefined,
): Address | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!isAddress(trimmed)) return null;
  return getAddress(trimmed);
}
