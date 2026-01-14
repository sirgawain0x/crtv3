"use client";

import { shortenAddress } from "@/lib/utils/utils";
import { formatProposalAuthor } from "@/lib/utils/linked-identity";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";

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
 * In the future, this could query a database or use Delegate.cash
 * to find the Smart Wallet associated with an EOA
 */
export function useSmartWalletFromEOA(eoaAddress: string | null) {
  // TODO: Implement mapping from EOA to Smart Wallet
  // This could:
  // 1. Query a database mapping table
  // 2. Use Delegate.cash to find delegations
  // 3. Check on-chain if EOA is owner of a Smart Wallet
  
  // For now, return null (we'll enhance this later)
  return null;
}
