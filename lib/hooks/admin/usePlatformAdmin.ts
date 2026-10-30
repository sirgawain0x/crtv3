"use client";

import { useMemo } from "react";
import { isPlatformAdmin } from "@/lib/access/platform-admin";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { useUser } from "@/lib/wallet/react";

export function usePlatformAdmin() {
  const user = useUser();
  const { smartAccountAddress } = useWalletStatus();

  const walletAddress = smartAccountAddress ?? user?.address ?? null;

  const isAdmin = useMemo(
    () =>
      isPlatformAdmin(walletAddress) ||
      isPlatformAdmin(user?.address ?? null),
    [walletAddress, user?.address],
  );

  return {
    walletAddress,
    isAdmin,
    isLoading: false,
  };
}
