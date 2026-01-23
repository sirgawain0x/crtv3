"use client";

import { shortenAddress } from "@/lib/utils/utils";
import { formatProposalAuthor } from "@/lib/utils/linked-identity";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { useMemo } from "react";
import { logger } from "@/lib/utils/logger";

/**
 * Component to display linked identity for proposals
 * 
 * Shows: "Submitted by [Smart Wallet] via [EOA]"
 * 
 * Since Snapshot stores the EOA as the author, we need to:
 * 1. Check if the author EOA belongs to a Smart Wallet
 * 2. Display the Smart Wallet as primary identity
 * 3. Show EOA as the signing address
 */
interface LinkedIdentityDisplayProps {
  authorEOA: string; // The EOA address from Snapshot (proposal.author)
  smartWalletAddress?: string | null; // Optional: if we know the Smart Wallet from metadata
  showFull?: boolean; // Show full addresses instead of shortened
}

export function LinkedIdentityDisplay({
  authorEOA,
  smartWalletAddress: providedSmartWallet,
  showFull = false,
}: LinkedIdentityDisplayProps) {
  // Check if current user is the author (to show their Smart Wallet)
  const { walletAddress, smartAccountAddress } = useWalletStatus();
  const isCurrentUser = walletAddress?.toLowerCase() === authorEOA.toLowerCase();
  
  // Use provided Smart Wallet or current user's Smart Wallet if they're the author
  const smartWalletAddress = providedSmartWallet || (isCurrentUser ? smartAccountAddress : null);

  // If we have a Smart Wallet address and it's different from EOA, show linked identity
  if (smartWalletAddress && smartWalletAddress.toLowerCase() !== authorEOA.toLowerCase()) {
    const displayText = formatProposalAuthor(smartWalletAddress, authorEOA);
    return (
      <div className="text-gray-500">
        <span className="font-medium">Submitted by:</span> {displayText}
      </div>
    );
  }

  // Otherwise, just show the EOA address
  return (
    <div className="text-gray-500">
      <span className="font-medium">Submitted by:</span>{" "}
      {showFull ? authorEOA : shortenAddress(authorEOA)}
    </div>
  );
}

/**
 * Hook to get Smart Wallet address from EOA
 * 
 * This implementation:
 * 1. Checks if the EOA matches the current user's EOA (returns their smart wallet)
 * 2. Future enhancements could:
 *    - Query a database mapping table
 *    - Use Delegate.cash to find delegations
 *    - Check on-chain registry for EOA -> Smart Wallet mappings
 *    - Use Account Kit's factory to compute smart wallet address deterministically
 * 
 * @param eoaAddress - The EOA address to find the smart wallet for
 * @returns Smart wallet address if found, null otherwise
 */
export function useSmartWalletFromEOA(eoaAddress: string | null) {
  const { walletAddress, smartAccountAddress } = useWalletStatus();
  
  return useMemo(() => {
    if (!eoaAddress) {
      return null;
    }

    // Normalize addresses for comparison
    const normalizedEOA = eoaAddress.toLowerCase();
    const normalizedWalletAddress = walletAddress?.toLowerCase();
    const normalizedSmartAccount = smartAccountAddress?.toLowerCase();

    // If the EOA matches the current user's EOA, return their smart wallet
    if (normalizedWalletAddress === normalizedEOA && normalizedSmartAccount) {
      logger.debug('Found smart wallet for current user EOA', {
        eoa: eoaAddress,
        smartWallet: smartAccountAddress,
      });
      return smartAccountAddress;
    }

    // If addresses are the same, it's not a smart wallet
    if (normalizedEOA === normalizedSmartAccount) {
      return null;
    }

    // TODO: Future enhancements
    // 1. Query database for EOA -> Smart Wallet mappings
    // 2. Use Delegate.cash API to find delegations
    // 3. Check on-chain registry contracts
    // 4. Use Account Kit factory to compute deterministic address
    
    logger.debug('Could not find smart wallet for EOA', { eoa: eoaAddress });
    return null;
  }, [eoaAddress, walletAddress, smartAccountAddress]);
}
