"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUser, useSmartAccountClient } from "@/lib/wallet/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { useWalletInitTimeout } from "@/lib/hooks/accountkit/useWalletInitTimeout";
import { useWalletClientContext } from "@/lib/wallet/wallet-context";

/**
 * Canonical creator identity for streams, uploads, and wallet-auth APIs.
 * Prefers the smart account address; falls back to EOA for pure EOA users.
 */
export function useCreatorWalletAddress() {
  const { authenticated, ready } = usePrivy();
  const user = useUser();
  const { eoaAddress: contextEoa } = useWalletClientContext();
  const { address: scaFromClient, isLoadingClient } = useSmartAccountClient({});
  const { address: scaFromModular, loading: isModularLoading } = useModularAccount();

  const smartAccountAddress = scaFromModular || scaFromClient || null;
  const eoaAddress = user?.address ?? contextEoa ?? null;

  const creatorAddress = useMemo(() => {
    return smartAccountAddress || eoaAddress || null;
  }, [smartAccountAddress, eoaAddress]);

  const signerAddress = useMemo(() => {
    if (!eoaAddress || !creatorAddress) return null;
    if (eoaAddress.toLowerCase() === creatorAddress.toLowerCase()) return null;
    return eoaAddress;
  }, [eoaAddress, creatorAddress]);

  const isAuthenticated = ready && authenticated;
  const waitingForCreatorAddress =
    isAuthenticated && !creatorAddress && (isLoadingClient || isModularLoading);
  const walletInitTimedOut = useWalletInitTimeout(waitingForCreatorAddress);

  const isLoading =
    !ready ||
    (waitingForCreatorAddress && !walletInitTimedOut);

  return {
    creatorAddress,
    smartAccountAddress,
    eoaAddress,
    signerAddress,
    isLoading,
    isAuthenticated,
    walletInitTimedOut,
    /** Signed in with a resolvable creator address (or timed out / fallback EOA). */
    isConnected: isAuthenticated && !!creatorAddress,
  };
}
