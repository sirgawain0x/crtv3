"use client";

import { useMembershipVerification } from "./useMembershipVerification";
import { useUser } from "@/lib/wallet/react";
import { computeIsMembershipLoading } from "./membershipLoading";

/**
 * Hook to check if the current user has a valid Creative Membership
 * Returns true if the user holds a valid key to any of the configured locks
 */
export function useIsMember() {
  const user = useUser();
  const { isVerified, hasMembership, isLoading, error, refetch } =
    useMembershipVerification();

  const isMembershipLoading = computeIsMembershipLoading({
    isLoading,
    isVerified,
    hasUser: !!user,
    error,
  });

  return {
    isMember: isVerified ? hasMembership : false,
    isVerified,
    isLoading: isMembershipLoading,
    refetch,
  };
}
