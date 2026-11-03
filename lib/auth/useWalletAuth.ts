"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useSignMessage, useUser } from "@/lib/wallet/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import {
  cachedWalletAuth, clearWalletAuth, requestWalletAuth, setWalletAuthOwner,
  subscribeWalletAuth, walletAuthRevision,
} from "./wallet-auth-cache";

export interface AuthHeaders {
  "X-Wallet-Address": string;
  "X-Wallet-Timestamp": string;
  "X-Wallet-Signature": string;
  [key: string]: string;
}

/** Global wallet auth waits for the smart account client. */
export function computeWalletAuthIsReady(accountClient: unknown, address: string): boolean {
  return !!accountClient && !!address;
}

/** Shares short-lived wallet proof across consumers. Only getAuthHeaders may prompt. */
export function useWalletAuth() {
  const user = useUser();
  const { smartAccountClient: accountClient, address: smartAccountAddress } = useModularAccount();
  // Account clients may linger while sign-out is propagating.
  const address = user ? (smartAccountAddress || user.address || "").toLowerCase() : "";
  const currentAddress = useRef(address);
  currentAddress.current = address;
  const { signMessage } = useSignMessage({ client: accountClient || undefined });
  const revision = useSyncExternalStore(subscribeWalletAuth, walletAuthRevision, () => 0);

  useEffect(() => { setWalletAuthOwner(address); }, [address]);

  const getCachedAuthHeaders = useCallback((): AuthHeaders | null => {
    return currentAddress.current === address ? cachedWalletAuth(address) : null;
    // Recreate when another consumer verifies or clears the shared proof.
  }, [address, revision]);

  const getAuthHeaders = useCallback(async (): Promise<AuthHeaders> => {
    if (currentAddress.current !== address) throw new Error("The connected account changed. Please retry.");
    return requestWalletAuth(address, (message) => signMessage({ message }));
  }, [address, signMessage]);

  return {
    address: address || null,
    getAuthHeaders,
    getCachedAuthHeaders,
    clearAuthCache: clearWalletAuth,
    isReady: computeWalletAuthIsReady(accountClient, address),
  };
}
