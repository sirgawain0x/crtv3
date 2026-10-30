"use client";

import { useMemo } from "react";
import { useUser, useSmartAccountClient } from "@/lib/wallet/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { isVideoAdminAddress } from "@/lib/constants/admin";

export function useIsVideoAdmin(): boolean {
  const user = useUser();
  const { address: scaAddress } = useSmartAccountClient({});
  const { account } = useModularAccount();

  return useMemo(() => {
    const candidates = [
      account?.address,
      scaAddress,
      user?.address,
    ].filter(Boolean) as string[];

    return candidates.some(isVideoAdminAddress);
  }, [account?.address, scaAddress, user?.address]);
}
