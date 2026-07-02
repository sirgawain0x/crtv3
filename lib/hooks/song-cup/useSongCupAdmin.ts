"use client";

import { useMemo } from "react";
import { useUser } from "@/lib/wallet/react";
import { isSongCupAdminWallet } from "@/lib/songchain/song-cup/admin-config";

export function useSongCupAdmin() {
  const user = useUser();

  const isAdmin = useMemo(
    () => isSongCupAdminWallet(user?.address),
    [user?.address],
  );

  return { isAdmin, walletAddress: user?.address ?? null };
}
