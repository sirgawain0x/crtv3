/** Admin xMerch panel only — EOA vs smart-account signing without changing global useWalletAuth. */

export type PlatformAdminSignMode = "smart-account" | "eoa" | "none";

export function resolvePlatformAdminSignMode(
  adminAuthAddress: string | null | undefined,
  smartAccountAddress: string | null | undefined,
  eoaAddress: string | null | undefined,
): PlatformAdminSignMode {
  if (!adminAuthAddress?.trim()) return "none";
  const auth = adminAuthAddress.trim().toLowerCase();
  const smart = (smartAccountAddress || "").toLowerCase();
  const eoa = (eoaAddress || "").toLowerCase();
  if (smart && auth === smart) return "smart-account";
  if (eoa && auth === eoa) return "eoa";
  return "none";
}

/** True when the panel can request a signature for the resolved admin auth address. */
export function isPlatformAdminWalletAuthReady(
  mode: PlatformAdminSignMode,
  hasSmartAccountClient: boolean,
): boolean {
  if (mode === "none") return false;
  if (mode === "smart-account") return hasSmartAccountClient;
  return true;
}
