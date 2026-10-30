"use client";

import { useMemo } from "react";
import { resolvePlatformAdminAuthAddress } from "@/lib/access/platform-admin";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { useUser } from "@/lib/wallet/react";

export function usePlatformAdmin() {
  const user = useUser();
  const { smartAccountAddress } = useWalletStatus();

  const connectedAddress = smartAccountAddress ?? user?.address ?? null;

  const adminAuthAddress = useMemo(
    () =>
      resolvePlatformAdminAuthAddress(
        smartAccountAddress,
        user?.address ?? null,
      ),
    [smartAccountAddress, user?.address],
  );

  return {
    /** Address that must sign admin API requests (EOA or smart account). */
    adminAuthAddress,
    walletAddress: adminAuthAddress ?? connectedAddress,
    isAdmin: adminAuthAddress !== null,
    isLoading: false,
  };
}
