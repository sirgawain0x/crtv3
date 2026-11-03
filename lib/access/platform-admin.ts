import { getAddress, isAddress } from "viem";

export const PLATFORM_ADMIN_ADDRESS =
  "0xdE4b0371BBa20602685916ceeE5B22025a811734" as const;

export function isPlatformAdmin(address: string | null | undefined): boolean {
  if (!address || !isAddress(address)) return false;
  try {
    return getAddress(address).toLowerCase() === PLATFORM_ADMIN_ADDRESS.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Wallet address to authenticate as for platform-admin API calls when the
 * session has both an EOA and a smart account. Matches server
 * `requirePlatformAdmin` (checks the signed header address only).
 */
export function resolvePlatformAdminAuthAddress(
  smartAccountAddress: string | null | undefined,
  eoaAddress: string | null | undefined,
): string | null {
  if (isPlatformAdmin(smartAccountAddress)) {
    return getAddress(smartAccountAddress as `0x${string}`).toLowerCase();
  }
  if (isPlatformAdmin(eoaAddress)) {
    return getAddress(eoaAddress as `0x${string}`).toLowerCase();
  }
  return null;
}
