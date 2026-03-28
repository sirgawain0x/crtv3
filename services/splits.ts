"use client";

/**
 * Splits.org service for creating and managing revenue splits
 * This is a client-side service that uses the smart account client
 */

import type { SplitCreationResult, VideoCollaborator } from "@/lib/types/splits";
import type { Address } from "viem";

/**
 * Get collaborators for a video asset via API
 */
export async function getVideoCollaborators(videoId: number): Promise<VideoCollaborator[]> {
  try {
    const response = await fetch(`/api/video-assets/${videoId}/collaborators`);
    if (!response.ok) {
      return [];
    }
    const result = await response.json();
    return (result.data || result || []) as VideoCollaborator[];
  } catch (error) {
    console.error('Failed to fetch collaborators:', error);
    return [];
  }
}

/**
 * Get creator's meToken address for a video
 * Exported for use in components that need to distribute revenue
 */
export async function getCreatorMeTokenAddress(videoId: number): Promise<Address | null> {
  try {
    // Fetch video asset to get creator info
    const response = await fetch(`/api/video-assets/${videoId}`);
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    const videoAsset = result.data || result;
    
    if (!videoAsset?.creator_metoken_id) {
      return null;
    }

    // Fetch meToken by ID to get its address
    const meTokenResponse = await fetch(`/api/metokens/by-id/${videoAsset.creator_metoken_id}`);
    if (!meTokenResponse.ok) {
      return null;
    }
    const meTokenResult = await meTokenResponse.json();
    const meToken = meTokenResult.data || meTokenResult;
    
    return (meToken?.address as Address) || null;
  } catch (error) {
    console.error('Failed to fetch creator meToken address:', error);
    return null;
  }
}

/**
 * Create a split contract for a video using Splits SDK
 * This function should be called from a client component with access to the smart account client
 * 
 * IMPORTANT: The split contract will distribute the creator's meToken to collaborators.
 * When revenue comes in (in the creator's meToken), call distribute() with the meToken address.
 * 
 * @param videoId - The video asset ID
 * @param client - The smart account client from Account Kit
 * @returns Split contract address and transaction hash
 */
export async function createSplitForVideo(
  videoId: number,
  client: any // Smart account client from Account Kit
): Promise<SplitCreationResult> {
  try {
    // Get collaborators from database
    const collaborators = await getVideoCollaborators(videoId);

    if (!collaborators || collaborators.length === 0) {
      return {
        success: false,
        error: "No collaborators found for this video",
      };
    }

    // Get creator's meToken address - collaborators will be paid in this token
    const creatorMeTokenAddress = await getCreatorMeTokenAddress(videoId);
    
    if (!creatorMeTokenAddress) {
      return {
        success: false,
        error: "Creator must have a meToken to create revenue splits. Collaborators will be paid in the creator's meToken.",
      };
    }

    // Validate total percentage equals 10000 (100% in basis points)
    const totalPercentage = collaborators.reduce(
      (sum: number, c: VideoCollaborator) => sum + (c.share_percentage || 0),
      0
    );

    if (totalPercentage !== 10000) {
      return {
        success: false,
        error: `Total percentage must equal 100%. Current: ${totalPercentage / 100}%`,
      };
    }

    // Import Splits SDK dynamically - using SplitV2Client as per Splits V2 documentation
    const { SplitV2Client } = await import("@0xsplits/splits-sdk");
    
    // Get the chain ID from the client
    const chainId = client.chain?.id || 8453; // Default to Base mainnet
    
    // Create Splits V2 client
    // Note: Splits SDK expects a wallet client, but we're using smart account client
    // We may need to adapt this based on Splits SDK requirements
    const splitsClient = new SplitV2Client({
      chainId,
      publicClient: client.getPublicClient?.() || client,
      walletClient: client, // Use smart account client as wallet client
    });

    // Prepare recipients array for split creation
    const recipients = collaborators.map((collab) => ({
      address: collab.collaborator_address as Address,
      percentAllocation: collab.share_percentage, // Already in basis points (0-10000)
    }));

    // Create the split contract
    // TODO: Verify the correct method name with Splits SDK documentation
    // Using type assertion to bypass TypeScript error until SDK types are confirmed
    const splitResult = await (splitsClient as any).createSplit({
      recipients,
      distributorFeePercent: 0, // No distributor fee
    });

    // Extract split address and transaction hash from result
    // The SDK may return different structures, so we handle multiple formats
    const splitAddress = typeof splitResult === 'string' 
      ? splitResult 
      : splitResult?.splitAddress || splitResult?.address || splitResult?.contractAddress;
    const txHash = splitResult?.txHash || splitResult?.transactionHash || splitResult?.hash;

    if (!splitAddress) {
      throw new Error("Split contract address not returned from SDK");
    }

    return {
      success: true,
      splitAddress: splitAddress as string,
      txHash: txHash as string | undefined,
      // Note: The meToken address is stored in the video asset's creator_metoken_id
      // When distributing revenue, use the creator's meToken address as the tokenAddress
    };
  } catch (error) {
    console.error("Failed to create split contract:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating split",
    };
  }
}

/**
 * Get the balance of a token in a split contract
 * Returns the total balance available for distribution (split balance + warehouse balance)
 * 
 * @param splitAddress - The split contract address
 * @param meTokenAddress - The token address (creator's meToken)
 * @param client - The smart account client from Account Kit
 * @returns Balance in wei (bigint)
 */
export async function getSplitBalance(
  splitAddress: Address,
  meTokenAddress: Address,
  client: any
): Promise<{ success: boolean; balance?: bigint; error?: string }> {
  try {
    // Import Splits SDK dynamically
    const { SplitV2Client } = await import("@0xsplits/splits-sdk");
    
    // Get the chain ID from the client
    const chainId = client.chain?.id || 8453; // Default to Base mainnet
    
    // Create Splits client (only need public client for reading)
    const splitsClient = new SplitV2Client({
      chainId,
      publicClient: client.getPublicClient?.() || client,
    });

    // Get the split balance
    const result = await (splitsClient as any).getSplitBalance({
      splitAddress,
      tokenAddress: meTokenAddress,
    });

    // Total balance is splitBalance + warehouseBalance
    const totalBalance = (result?.splitBalance || 0n) + (result?.warehouseBalance || 0n);

    return {
      success: true,
      balance: totalBalance,
    };
  } catch (error) {
    console.error("Failed to get split balance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error getting balance",
    };
  }
}

/**
 * Distribute revenue from a split contract using the creator's meToken
 * This function distributes the creator's meToken to all collaborators according to their percentages
 * 
 * @param splitAddress - The split contract address
 * @param meTokenAddress - The creator's meToken contract address (ERC20 token)
 * @param client - The smart account client from Account Kit
 * @param distributorAddress - Optional distributor address (defaults to split controller)
 * @returns Transaction hash
 */
export async function distributeSplitRevenue(
  splitAddress: Address,
  meTokenAddress: Address,
  client: any,
  distributorAddress?: Address
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Import Splits SDK dynamically
    const { SplitV2Client } = await import("@0xsplits/splits-sdk");
    
    // Get the chain ID from the client
    const chainId = client.chain?.id || 8453; // Default to Base mainnet
    
    // Create Splits client
    const splitsClient = new SplitV2Client({
      chainId,
      publicClient: client.getPublicClient?.() || client,
      walletClient: client,
    });

    // Distribute the creator's meToken to all collaborators
    // The split contract will automatically distribute according to the percentages
    const result = await (splitsClient as any).distribute({
      splitAddress,
      tokenAddress: meTokenAddress, // Creator's meToken address
      distributorAddress: distributorAddress || splitAddress, // Default to split controller
    });

    const txHash = result?.txHash || result?.transactionHash || result?.hash;

    return {
      success: true,
      txHash: txHash as string | undefined,
    };
  } catch (error) {
    console.error("Failed to distribute split revenue:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error distributing revenue",
    };
  }
}

