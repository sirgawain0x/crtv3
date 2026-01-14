"use client";

import { useMemo } from "react";
import { useWalletStatus } from "./accountkit/useWalletStatus";
import { getLinkedIdentity, isPermittedSigner, type LinkedIdentity } from "@/lib/utils/linked-identity";
import { useState, useEffect } from "react";

/**
 * Hook to get linked identity information
 * 
 * Returns the Smart Wallet as primary identity and EOA as signing identity
 * with verification that EOA is a permitted signer for the Smart Wallet
 */
export function useLinkedIdentity() {
  const { walletAddress, smartAccountAddress } = useWalletStatus();
  const [linkedIdentity, setLinkedIdentity] = useState<LinkedIdentity | null>(null);
  const [isPermitted, setIsPermitted] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Get linked identity info
  useEffect(() => {
    async function fetchLinkedIdentity() {
      if (!smartAccountAddress && !walletAddress) {
        setLinkedIdentity(null);
        return;
      }

      const identity = await getLinkedIdentity(smartAccountAddress, walletAddress);
      setLinkedIdentity(identity);
    }

    fetchLinkedIdentity();
  }, [smartAccountAddress, walletAddress]);

  // Verify EOA is permitted signer for Smart Wallet
  useEffect(() => {
    async function verifySigner() {
      if (!walletAddress || !smartAccountAddress) {
        setIsPermitted(null);
        return;
      }

      // If addresses are the same, it's an EOA account (always permitted)
      if (walletAddress.toLowerCase() === smartAccountAddress.toLowerCase()) {
        setIsPermitted(true);
        return;
      }

      setIsVerifying(true);
      try {
        const permitted = await isPermittedSigner(walletAddress, smartAccountAddress);
        setIsPermitted(permitted);
      } catch (error) {
        console.error("Error verifying permitted signer:", error);
        setIsPermitted(false);
      } finally {
        setIsVerifying(false);
      }
    }

    verifySigner();
  }, [walletAddress, smartAccountAddress]);

  return {
    linkedIdentity,
    isPermitted,
    isVerifying,
    // Convenience getters
    primaryAddress: linkedIdentity?.primaryAddress || smartAccountAddress,
    signingAddress: linkedIdentity?.signingAddress || walletAddress,
    displayText: linkedIdentity?.displayText || "",
    isLinked: linkedIdentity?.isLinked || false,
  };
}
