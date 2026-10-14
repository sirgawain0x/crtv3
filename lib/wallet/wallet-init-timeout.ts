/** Max time to wait for Privy wallet / smart-account client before showing recovery UI. */
export const WALLET_INIT_TIMEOUT_MS = 12_000;

export function hasWalletInitTimedOut(
  loadingStartedAtMs: number | null,
  nowMs: number = Date.now(),
): boolean {
  if (loadingStartedAtMs == null) return false;
  return nowMs - loadingStartedAtMs >= WALLET_INIT_TIMEOUT_MS;
}
