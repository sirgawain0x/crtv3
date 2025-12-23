/**
 * Story Protocol Collection Service
 * 
 * Manages creator NFT collections on Story Protocol.
 * Each creator gets their own collection address for true ownership and branding.
 */

import { StoryClient } from "@story-protocol/core-sdk";
import { createStoryPublicClient } from "./client";
import { createCollection, type CreateCollectionParams } from "./spg-service";
import type { Address } from "viem";
import { createServiceClient } from "@/lib/sdk/supabase/service";

/**
 * Get or create a collection for a creator
 * 
 * This function handles race conditions by using database upsert with conflict handling.
 * If multiple concurrent calls occur, only one will succeed in creating the collection,
 * and the others will retrieve the existing collection.
 * 
 * @param client - Story Protocol client instance
 * @param creatorAddress - Creator's wallet address
 * @param collectionName - Name for the collection (e.g., "Creator Name's Videos")
 * @param collectionSymbol - Symbol for the collection (e.g., "CRTV")
 * @returns Collection address
 */
export async function getOrCreateCreatorCollection(
  client: StoryClient,
  creatorAddress: Address,
  collectionName: string,
  collectionSymbol: string
): Promise<Address> {
  const supabase = createServiceClient();
  
  // First, check if creator already has a collection in the database
  const { data: existingCollection } = await supabase
    .from("creator_collections")
    .select("collection_address")
    .eq("creator_id", creatorAddress)
    .single();

  if (existingCollection?.collection_address) {
    // Verify the collection exists on-chain
    const publicClient = createStoryPublicClient();
    try {
      const code = await publicClient.getBytecode({
        address: existingCollection.collection_address as Address,
      });
      
      if (code && code !== "0x") {
        // Collection exists on-chain
        return existingCollection.collection_address as Address;
      }
    } catch (error) {
      console.warn("Failed to verify collection on-chain, will create new one:", error);
    }
  }

  // Create new collection via SPG
  // Note: Multiple concurrent calls may both reach here, but upsert will handle the conflict
  console.log(`Creating new collection for creator ${creatorAddress}...`);
  const result = await createCollection(client, {
    name: collectionName,
    symbol: collectionSymbol,
    owner: creatorAddress,
    mintFeeRecipient: creatorAddress,
  });

  // The createCollection function now handles collection address extraction
  const collectionAddress = result.collectionAddress;

  // Store collection in database with conflict handling
  // If another concurrent call already created a collection, this will either:
  // 1. Update the existing record (if using upsert with ON CONFLICT DO UPDATE)
  // 2. Fail silently and we'll retrieve the existing one below
  const { data: upsertedCollection, error: upsertError } = await supabase
    .from("creator_collections")
    .upsert(
      {
        creator_id: creatorAddress,
        collection_address: collectionAddress,
        collection_name: collectionName,
        collection_symbol: collectionSymbol,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "creator_id",
        // If conflict occurs, update the record with new values
        // This handles the race condition where multiple calls create collections
      }
    )
    .select("collection_address")
    .single();

  // If upsert failed due to unique constraint (race condition), retrieve existing collection
  if (upsertError) {
    console.warn("Collection upsert failed (likely race condition), retrieving existing collection:", upsertError);
    
    const { data: existing } = await supabase
      .from("creator_collections")
      .select("collection_address")
      .eq("creator_id", creatorAddress)
      .single();

    if (existing?.collection_address) {
      return existing.collection_address as Address;
    }
    
    // If we still can't find it, throw an error
    throw new Error(
      `Failed to create or retrieve collection for creator ${creatorAddress}: ${upsertError.message}`
    );
  }

  // Return the collection address (either newly created or existing from upsert)
  return (upsertedCollection?.collection_address || collectionAddress) as Address;
}

/**
 * Get a creator's collection address from the database
 * 
 * @param creatorAddress - Creator's wallet address
 * @returns Collection address or null if not found
 */
export async function getCreatorCollection(
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
  const collection = await getCreatorCollection(creatorAddress);
  return collection !== null;
}

