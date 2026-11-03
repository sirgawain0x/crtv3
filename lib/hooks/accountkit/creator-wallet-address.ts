import type { CompatUser } from "@/lib/wallet/react";

/**
 * Creator identity for streams and wallet-auth APIs: smart account when present,
 * otherwise EOA only for confirmed pure-EOA users — never the signer while SCA is loading.
 */
export function resolveCreatorWalletAddress(input: {
  smartAccountAddress: string | null | undefined;
  user: CompatUser | null;
}): string | null {
  const { smartAccountAddress, user } = input;
  if (smartAccountAddress) return smartAccountAddress;
  if (user?.type === "eoa" && user.address) return user.address;
  return null;
}

/** True while Privy session is active but smart-account address is not yet available. */
export function isAwaitingSmartAccountAddress(input: {
  authenticated: boolean;
  user: CompatUser | null;
  smartAccountAddress: string | null | undefined;
}): boolean {
  if (!input.authenticated) return false;
  if (input.smartAccountAddress) return false;
  if (input.user?.type === "eoa" && input.user.address) return false;
  return true;
}
