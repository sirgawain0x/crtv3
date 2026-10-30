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
