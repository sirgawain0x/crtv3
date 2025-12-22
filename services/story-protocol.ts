"use server";

/**
 * Server-side Story Protocol service functions
 * Orchestrates IP Asset registration and management
 */

import { createStoryClient } from "@/lib/sdk/story/client";
import { registerIPAsset, attachLicenseTerms } from "@/lib/sdk/story/ip-registration";
import { updateVideoAssetStoryIPStatus } from "./video-assets";
import type { VideoAsset } from "@/lib/types/video-asset";
import type {
  StoryIPRegistrationOptions,
  StoryIPRegistrationResult,
  StoryLicenseTerms,
  StoryIPAssetStatus,
} from "@/lib/types/story-protocol";
import type { Address } from "viem";

/**
 * Register a video as an IP Asset on Story Protocol
 * This orchestrates the full flow: mint NFT (if needed) -> register IP Asset -> attach license terms
 * 
 * @param videoAsset - Video asset to register
 * @param creatorAddress - Creator's wallet address
 * @param options - Registration options including license terms
 * @returns Registration result
 */
export async function registerVideoAsIPAsset(
  videoAsset: VideoAsset,
  creatorAddress: Address,
  options: StoryIPRegistrationOptions
): Promise<StoryIPRegistrationResult> {
  try {
    // Validate inputs
    if (!options.registerIP) {
      return {
        success: false,
        error: "IP registration not requested",
      };
    }

    if (!creatorAddress) {
      return {
        success: false,
        error: "Creator address is required",
      };
    }

    // Create Story Protocol client
    const storyClient = createStoryClient(creatorAddress);

    let nftContract: Address;
    let tokenId: string;

    // Step 1: Ensure video has an NFT (must be minted before IP registration)
    // Note: NFT minting functionality is not yet implemented in this integration.
    // Videos must be minted as NFTs through other means before IP registration.
    if (!videoAsset.contract_address || !videoAsset.token_id) {
      return {
        success: false,
        error: "Video must have an NFT minted before IP registration. Please mint the NFT first through your NFT minting flow, then register the IP Asset.",
      };
    }

    // Use existing NFT
    nftContract = videoAsset.contract_address as Address;
    tokenId = videoAsset.token_id;

    // Step 2: Register NFT as IP Asset on Story Protocol
    let ipId: string;
    let registrationTx: string;

    try {
      const registrationResult = await registerIPAsset(
        storyClient,
        nftContract,
        tokenId,
        options.metadataURI || videoAsset.metadata_uri || undefined
      );

      ipId = registrationResult.ipId;
      registrationTx = registrationResult.txHash;
    } catch (regError) {
      console.error("IP Asset registration failed:", regError);
      return {
        success: false,
        error: `IP Asset registration failed: ${regError instanceof Error ? regError.message : "Unknown error"}`,
      };
    }

    // Step 3: Attach license terms if provided
    let licenseTermsId: string | undefined;

    if (options.licenseTerms) {
      try {
        const licenseResult = await attachLicenseTerms(
          storyClient,
          ipId,
          options.licenseTerms
        );

        licenseTermsId = licenseResult.termsId;
      } catch (licenseError) {
        console.error("License terms attachment failed:", licenseError);
        // Don't fail the entire registration if license attachment fails
        // The IP Asset is still registered, license can be attached later
        console.warn("IP Asset registered but license terms attachment failed");
      }
    }

    // Step 4: Update video asset in database with Story Protocol data
    try {
      await updateVideoAssetStoryIPStatus(videoAsset.id, {
        story_ip_registered: true,
        story_ip_id: ipId,
        story_ip_registration_tx: registrationTx,
        story_license_terms_id: licenseTermsId || null,
        story_license_template_id: options.licenseTerms?.templateId || null,
      });
    } catch (dbError) {
      console.error("Failed to update video asset with Story Protocol data:", dbError);
      // IP Asset is registered on-chain, but DB update failed
      // Return success but log the error
      console.warn("IP Asset registered on-chain but database update failed");
    }

    return {
      success: true,
      ipId,
      registrationTx,
      licenseTermsId,
    };
  } catch (error) {
    console.error("Story Protocol registration error:", error);
    return {
      success: false,
      error: `Registration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get IP Asset status from Story Protocol
 * @param nftContract - NFT contract address
 * @param tokenId - NFT token ID
 * @param creatorAddress - Creator's wallet address (for client creation)
 * @returns IP Asset status
 */
export async function getIPAssetStatus(
  nftContract: Address,
  tokenId: string,
  creatorAddress: Address
): Promise<StoryIPAssetStatus | null> {
  try {
    const storyClient = createStoryClient(creatorAddress);
    const { verifyIPAssetRegistration } = await import("@/lib/sdk/story/ip-registration");

    // Use the chain ID from environment (1315 for aeneid testnet, 1514 for mainnet)
    const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
    const chainId = network === "testnet" ? BigInt(1315) : BigInt(1514);

    const result = await verifyIPAssetRegistration(storyClient, nftContract, tokenId, chainId);

    if (!result || !result.isRegistered) {
      return {
        ipId: result?.ipId || "",
        exists: false,
      };
    }

    return {
      ipId: result.ipId,
      exists: true,
      nftContract: nftContract,
      tokenId: tokenId,
    };
  } catch (error) {
    console.error("Failed to get IP Asset status:", error);
    return null;
  }
}

/**
 * Attach license terms to an existing IP Asset
 * @param ipId - IP Asset ID
 * @param creatorAddress - Creator's wallet address
 * @param licenseTerms - License terms to attach
 * @returns Success status and license terms ID
 */
export async function attachLicenseTermsToIP(
  ipId: string,
  creatorAddress: Address,
  licenseTerms: StoryLicenseTerms
): Promise<{ success: boolean; termsId?: string; error?: string }> {
  try {
    const storyClient = createStoryClient(creatorAddress);
    const result = await attachLicenseTerms(storyClient, ipId, licenseTerms);

    return {
      success: true,
      termsId: result.termsId,
    };
  } catch (error) {
    console.error("Failed to attach license terms:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

