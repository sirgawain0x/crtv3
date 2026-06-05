"use client";

import { useMemo } from "react";
import { isPlatformAdmin } from "@/lib/access/platform-admin";
import { hasValidCreatorPass } from "@/lib/access/creator-membership";
import { useMembershipVerification } from "@/lib/hooks/unlock/useMembershipVerification";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";

export const CREATOR_PREDICTION_BLOCK_MESSAGE =
  "Creator members can't create or bet on predictions — this keeps markets fair for fans.";

export function usePredictionAccess() {
  const { isConnected, walletAddress, smartAccountAddress } = useWalletStatus();
  const { membershipDetails, isLoading } = useMembershipVerification();

  const address = smartAccountAddress || walletAddress;

  const isAdmin = isPlatformAdmin(address);
  const isCreatorTier = hasValidCreatorPass(membershipDetails);

  const canCreatePrediction = useMemo(() => {
    if (!isConnected || !address) return false;
    if (isAdmin) return true;
    if (isCreatorTier) return false;
    return true;
  }, [isConnected, address, isAdmin, isCreatorTier]);

  const canBetOnPrediction = canCreatePrediction;

  const blockReason =
    isAdmin || !isCreatorTier ? null : CREATOR_PREDICTION_BLOCK_MESSAGE;

  return {
    canCreatePrediction,
    canBetOnPrediction,
    isAdmin,
    isCreatorTier,
    blockReason,
    isLoading,
    isConnected,
    address,
  };
}
