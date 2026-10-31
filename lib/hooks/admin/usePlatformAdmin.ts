"use client";

import { useMemo } from "react";
import { resolvePlatformAdminAuthAddress } from "@/lib/access/platform-admin";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { computePlatformAdminIsLoading } from "@/lib/hooks/admin/platform-admin-loading";

export function usePlatformAdmin() {
  const {
    smartAccountAddress,
    isLoadingClient,
    user,
    walletAddress: eoaAddress,
  } = useWalletStatus();

  const connectedAddress = smartAccountAddress ?? eoaAddress ?? null;

  const adminAuthAddress = useMemo(
    () =>
      resolvePlatformAdminAuthAddress(
        smartAccountAddress,
        user?.address ?? null,
      ),
    [smartAccountAddress, user?.address],
  );

  const isLoading = useMemo(
    () =>
      computePlatformAdminIsLoading(
        adminAuthAddress,
        user?.address ?? null,
        Boolean(user),
        isLoadingClient,
      ),
    [adminAuthAddress, user, isLoadingClient],
  );

  return {
    /** Address that must sign admin API requests (EOA or smart account). */
    adminAuthAddress,
    walletAddress: adminAuthAddress ?? connectedAddress,
    isAdmin: adminAuthAddress !== null,
    isLoading,
  };
}
