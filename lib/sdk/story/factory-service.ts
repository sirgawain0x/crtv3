/**
 * Story Protocol Creator IP Factory Service
 * 
 * Implements the Factory Pattern for creating creator-owned IP collections.
 * This service ensures that creators own their collections from day one, while
 * allowing the platform to mint on their behalf using the `recipient` parameter.
 * 
 * Architecture:
 * - Platform signs transactions (pays gas)
 * - Creator owns the collection (true ownership)
 * - Creator receives NFTs via `recipient` parameter (IP ownership)
 * - Platform acts as a "relayer" for minting operations
 * 
 * This pattern satisfies the "Sovereign Creator" requirement where creators
 * have full ownership of their IP assets while benefiting from platform services.
 */

import { StoryClient } from "@story-protocol/core-sdk";
import type { Address } from "viem";
import { createCollection, type CreateCollectionParams } from "./spg-service";
import { createServiceClient } from "@/lib/sdk/supabase/service";

/**
 * Parameters for creating a creator-owned collection via Factory
 */
export interface CreateCreatorCollectionParams {
  creatorAddress: Address; // Creator's wallet address (will own the collection)
  collectionName: string; // Collection name (e.g., "Creator Name's Videos")
  collectionSymbol: string; // Collection symbol (e.g., "CRTV")
  description?: string; // Optional collection description
  contractURI?: string; // IPFS URI for collection metadata
  baseURI?: string; // Base URI for token metadata
  maxSupply?: number; // Maximum supply of tokens
}

/**
 * Result of creating a creator-owned collection
 */
export interface CreatorCollectionResult {
  collectionAddress: Address; // Address of the created NFT collection
  creatorAddress: Address; // Creator who owns the collection
  txHash: string; // Transaction hash
}

/**
 * Create a new creator-owned collection using the Factory pattern
 * 
 * This function ensures that:
 * 1. The creator is set as the collection owner from day one
 * 2. The collection is stored in the database for future lookups
 * 3. The platform can mint on behalf of creators using the `recipient` parameter
 * 
 * @param client - Story Protocol client instance (signed by platform/funding wallet)
 * @param params - Collection creation parameters
 * @returns Collection address, creator address, and transaction hash
 */
export async function createCreatorCollection(
  client: StoryClient,
  params: CreateCreatorCollectionParams
): Promise<CreatorCollectionResult> {
  const supabase = createServiceClient();

  // Check if creator already has a collection
  const { data: existingCollection } = await supabase
    .from("creator_collections")
    .select("collection_address")
    .eq("creator_id", params.creatorAddress)
    .single();

  if (existingCollection?.collection_address) {
    // Verify the collection exists on-chain
    const { createStoryPublicClient } = await import("./client");
    const publicClient = createStoryPublicClient();
    
    try {
      const code = await publicClient.getBytecode({
        address: existingCollection.collection_address as Address,
      });

      if (code && code !== "0x") {
        // Collection exists on-chain, return it
        return {
          collectionAddress: existingCollection.collection_address as Address,
          creatorAddress: params.creatorAddress,
          txHash: "", // No new transaction
        };
      }
    } catch (error) {
      console.warn("Failed to verify collection on-chain, will create new one:", error);
    }
  }

  // Create new collection with creator as owner
  // The client is signed by the platform (accountAddress), but we set owner to creator
  console.log(`🏭 Factory: Creating creator-owned collection for ${params.creatorAddress}...`, {
    name: params.collectionName,
    symbol: params.collectionSymbol,
    owner: params.creatorAddress, // Creator owns from day one
  });

  const result = await createCollection(client, {
    name: params.collectionName,
    symbol: params.collectionSymbol,
    description: params.description,
    owner: params.creatorAddress, // CRITICAL: Creator owns the collection
    mintFeeRecipient: params.creatorAddress, // Creator receives mint fees
    contractURI: params.contractURI,
    baseURI: params.baseURI,
    maxSupply: params.maxSupply,
  });

  // Store collection in database
  const { error: upsertError } = await supabase
    .from("creator_collections")
    .upsert(
      {
        creator_id: params.creatorAddress,
        collection_address: result.collectionAddress,
        collection_name: params.collectionName,
        collection_symbol: params.collectionSymbol,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "creator_id",
      }
    );

  if (upsertError) {
    console.warn("Failed to store collection in database:", upsertError);
    // Don't throw - collection was created successfully on-chain
  }

  return {
    collectionAddress: result.collectionAddress,
    creatorAddress: params.creatorAddress,
    txHash: result.txHash,
  };
}

/**
 * Get a creator's collection address
 * 
 * @param creatorAddress - Creator's wallet address
 * @returns Collection address or null if not found
 */
export async function getCreatorCollectionAddress(
  creatorAddress: Address
): Promise<Address | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("creator_collections")
    .select("collection_address")
    .eq("creator_id", creatorAddress)
    .single();

  return data?.collection_address as Address | null;
}

/**
 * Check if a creator has a collection
 * 
 * @param creatorAddress - Creator's wallet address
 * @returns True if creator has a collection, false otherwise
 */
export async function hasCreatorCollection(
  creatorAddress: Address
): Promise<boolean> {
  const collection = await getCreatorCollectionAddress(creatorAddress);
  return collection !== null;
}

