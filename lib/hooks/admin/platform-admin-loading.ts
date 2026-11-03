import { isPlatformAdmin } from "@/lib/access/platform-admin";

/** Avoid flashing "Platform admin required" while the smart account may still be loading. */
export function computePlatformAdminIsLoading(
  adminAuthAddress: string | null,
  eoaAddress: string | null | undefined,
  isUserConnected: boolean,
  isLoadingClient: boolean,
): boolean {
  if (adminAuthAddress !== null) return false;
  if (!isUserConnected) return false;
  if (isPlatformAdmin(eoaAddress ?? null)) return false;
  return isLoadingClient;
}
