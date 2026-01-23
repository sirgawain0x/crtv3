/**
 * Story Protocol NFT Minting Service
 * Handles minting NFTs that will be registered on Story Protocol
 * 
 * This implementation supports both Base chain ERC-721 minting and Story Protocol SPG minting.
 */

import { StoryClient } from "@story-protocol/core-sdk";
import type { Address } from "viem";
import { mintVideoNFT, getNFTContractAddress } from "@/lib/sdk/nft/minting-service";
import { mintVideoNFTOnStory } from "@/lib/sdk/nft/minting-service";
import { createStoryClient } from "@/lib/sdk/story/client";
import { serverLogger } from "@/lib/utils/logger";

export interface MintNFTResult {
  tokenId: string;
  contractAddress: Address;
  txHash: string;
}

/**
 * Mint an NFT for a video asset
 * 
 * This function supports two minting modes:
 * 1. Story Protocol SPG minting (if collectionAddress is provided)
 * 2. Base chain ERC-721 minting (if NEXT_PUBLIC_NFT_CONTRACT_ADDRESS is configured)
 * 
 * @param client - Story Protocol client instance (used for Story Protocol minting)
 * @param metadataURI - IPFS metadata URI for the NFT
 * @param recipient - Address to receive the NFT
 * @param collectionAddress - Optional Story Protocol collection address (if using Story Protocol)
 * @param smartAccountClient - Optional smart account client for Base chain minting
 * @returns Mint result with token ID, contract address, and transaction hash
 */
export async function mintNFTWithStoryClient(
  client: StoryClient,
  metadataURI: string,
  recipient: Address,
  collectionAddress?: Address,
  smartAccountClient?: any // Optional smart account client for Base chain minting
): Promise<MintNFTResult> {
  try {
    // Priority 1: Use Story Protocol minting if collection address is provided
    if (collectionAddress) {
      serverLogger.debug('Using Story Protocol minting with collection:', collectionAddress);
      
      // Extract account address from Story client
      // Story client's account is typically the address used for signing
      const accountAddress = (client as any).account?.address || recipient;
      
      const result = await mintVideoNFTOnStory(
        accountAddress,
        recipient,
        metadataURI,
        collectionAddress
      );

      return {
        tokenId: result.tokenId,
        contractAddress: result.collectionAddress,
        txHash: result.txHash,
      };
    }

    // Priority 2: Use Base chain ERC-721 minting if contract address is configured
    const nftContractAddress = getNFTContractAddress();
    if (nftContractAddress) {
      serverLogger.debug('Using Base chain ERC-721 minting with contract:', nftContractAddress);
      
      if (!smartAccountClient) {
        throw new Error(
          "Smart account client is required for Base chain NFT minting. " +
          "Please provide a smart account client or use Story Protocol minting with a collection address."
        );
      }

      const result = await mintVideoNFT(
        smartAccountClient,
        nftContractAddress,
        recipient,
        metadataURI
      );

      return {
        tokenId: result.tokenId,
        contractAddress: result.contractAddress,
        txHash: result.txHash,
      };
    }

    // No minting method available
    throw new Error(
      "NFT minting cannot be performed. Please either:\n" +
      "1. Provide a Story Protocol collection address, or\n" +
      "2. Configure NEXT_PUBLIC_NFT_CONTRACT_ADDRESS environment variable for Base chain minting"
    );
  } catch (error) {
    serverLogger.error('NFT minting failed:', error);
    throw new Error(
      `NFT minting failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if a video already has an NFT minted
 * @param contractAddress - NFT contract address
 * @param tokenId - NFT token ID
 * @param publicClient - Optional public client for on-chain verification
 * @returns True if NFT exists, false otherwise
 */
export async function checkNFTExists(
  contractAddress: Address,
  tokenId: string,
  publicClient?: any
): Promise<boolean> {
  if (!contractAddress || !tokenId) {
    return false;
  }

  // If public client is provided, verify on-chain
  if (publicClient) {
    try {
      // Try to read the owner of the token
      const owner = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            name: 'ownerOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            outputs: [{ name: '', type: 'address' }],
          },
        ],
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      });
      
      // If owner is not zero address, NFT exists
      return owner && owner !== '0x0000000000000000000000000000000000000000';
    } catch (error) {
      serverLogger.warn('Failed to verify NFT existence on-chain:', error);
      // Fallback to basic check
      return true;
    }
  }

  // Fallback: return true if both address and tokenId are provided
  return true;
}

