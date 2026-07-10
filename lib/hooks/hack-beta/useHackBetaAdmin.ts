"use client";

import { useMemo } from "react";
import { useUser } from "@/lib/wallet/react";
import { isHackBetaAdminWallet } from "@/lib/chones/hack-beta/admin-config";

export function useHackBetaAdmin() {
  const user = useUser();

  const isAdmin = useMemo(
    () => isHackBetaAdminWallet(user?.address),
    [user?.address],
  );

  return { isAdmin, walletAddress: user?.address ?? null };
}
