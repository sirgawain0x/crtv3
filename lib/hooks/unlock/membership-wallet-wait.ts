/** Error code when smart-account init exceeds the wallet timeout. */
export const WALLET_INIT_TIMEOUT_CODE = "WALLET_INIT_TIMEOUT" as const;

/**
 * Whether membership verification should wait for the smart account (timer runs even when useUser() is null).
 */
export function shouldWaitForMembershipSmartAccount(input: {
  ready: boolean;
  authenticated: boolean;
  userType: "eoa" | "sca" | undefined;
  smartAccountAddress: string | null | undefined;
}): boolean {
  if (!input.ready || !input.authenticated) return false;
  if (input.userType === "eoa") return false;
  if (input.smartAccountAddress) return false;
  return true;
}

/**
 * Whether membership verification is blocked on wallet/Privy init (timeout applies to every wait state).
 */
export function shouldWaitForMembershipWalletInit(input: {
  ready: boolean;
  authenticated: boolean;
  userType: "eoa" | "sca" | undefined;
  smartAccountAddress: string | null | undefined;
  userAddress: string | null | undefined;
}): boolean {
  if (!input.ready) return true;
  if (!input.authenticated) return false;
  if (input.userType === "eoa") {
    return !input.userAddress;
  }
  if (input.smartAccountAddress) return false;
  return true;
}
