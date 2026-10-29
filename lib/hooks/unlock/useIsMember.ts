"use client";

import { useMembershipVerification } from "./useMembershipVerification";
import { useUser } from "@/lib/wallet/react";

/**
 * Hook to check if the current user has a valid Creative Membership
 * Returns true if the user holds a valid key to any of the configured locks
 */
export function useIsMember() {
  const user = useUser();
  const { isVerified, hasMembership, isLoading, refetch } =
    useMembershipVerification();

  const isMembershipLoading = isLoading || (!!user && !isVerified);

  return {
    isMember: isVerified ? hasMembership : false,
    isVerified,
    isLoading: isMembershipLoading,
    refetch,
  };
}
