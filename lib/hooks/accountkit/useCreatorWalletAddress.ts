"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUser, useSmartAccountClient } from "@/lib/wallet/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { useWalletInitTimeout } from "@/lib/hooks/accountkit/useWalletInitTimeout";
import { useWalletClientContext } from "@/lib/wallet/wallet-context";
import {
  isAwaitingSmartAccountAddress,
  resolveCreatorWalletAddress,
} from "@/lib/hooks/accountkit/creator-wallet-address";

/**
 * Canonical creator identity for streams, uploads, and wallet-auth APIs.
 * Uses smart account when present; EOA only for confirmed pure-EOA users.
 */
export function useCreatorWalletAddress() {
  const { authenticated, ready } = usePrivy();
  const user = useUser();
  const { eoaAddress: contextEoa } = useWalletClientContext();
  const { address: scaFromClient } = useSmartAccountClient({});
  const { address: scaFromModular } = useModularAccount();

  const smartAccountAddress = scaFromModular || scaFromClient || null;
  const eoaAddress = contextEoa ?? user?.address ?? null;

  const creatorAddress = useMemo(
    () =>
      resolveCreatorWalletAddress({
        smartAccountAddress,
        user,
      }),
    [smartAccountAddress, user],
  );

  const signerAddress = useMemo(() => {
    if (!eoaAddress || !creatorAddress) return null;
    if (eoaAddress.toLowerCase() === creatorAddress.toLowerCase()) return null;
    return eoaAddress;
  }, [eoaAddress, creatorAddress]);

  const isAuthenticated = ready && authenticated;
  const awaitingSmartAccount = isAwaitingSmartAccountAddress({
    authenticated: isAuthenticated,
    user,
    smartAccountAddress,
  });
  const walletInitTimedOut = useWalletInitTimeout(awaitingSmartAccount);

  const isLoading = !ready || (awaitingSmartAccount && !walletInitTimedOut);

  return {
    creatorAddress,
    smartAccountAddress,
    eoaAddress,
    signerAddress,
    isLoading,
    isAuthenticated,
    walletInitTimedOut,
    awaitingSmartAccount,
    isConnected: isAuthenticated && !!creatorAddress,
  };
}
