"use server";

/**
 * Story Protocol Collection Service
 * 
 * Manages creator NFT collections on Story Protocol.
 * Each creator gets their own collection address for true ownership and branding.
 * 
 * This service uses the Factory Pattern to ensure creators own their collections
 * from day one. The platform can mint on behalf of creators using the `recipient`
 * parameter in mintAndRegisterIp, but creators maintain full ownership.
 * 
 * Ownership Model:
 * - Creator owns the collection (set as owner during creation)
 * - Platform signs transactions (pays gas via factory owner)
 * - Creator receives NFTs via `recipient` parameter (IP ownership)
 * - Platform acts as a "relayer" for minting operations
 * 
 * Collection Creation Strategy:
 * 1. First, try to use the factory contract (if configured)
 * 2. Fallback to Story Protocol SPG (createCollection) if factory not available
 */

import { StoryClient } from "@story-protocol/core-sdk";
import { createStoryPublicClient } from "./client";
import { createCollection, type CreateCollectionParams } from "./spg-service";
import { 
  getFactoryContractAddress, 
  getCreatorCollectionAddress,
  computeCollectionAddress,
  getCollectionBytecode,
  deployCreatorCollection 
} from "./factory-contract-service";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getStoryRpcUrl } from "./client";
import type { Address } from "viem";
import { createServiceClient } from "@/lib/sdk/supabase/service";
import { serverLogger } from '@/lib/utils/logger';


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
      serverLogger.warn("Failed to verify collection on-chain, will create new one:", error);
    }
  }

  // Try to use factory contract first (if configured), then fallback to SPG
  const factoryAddress = getFactoryContractAddress();
  let collectionAddress: Address;

  if (factoryAddress) {
    // Use factory contract directly (server-side deployment)
    serverLogger.debug(`🏭 Creating new collection via factory for creator ${creatorAddress}...`, {
      factory: factoryAddress,
      owner: creatorAddress, // Creator owns from day one
    });

    try {
      // Check if collection already exists on-chain (may have been deployed but not in DB)
      const existingOnChain = await getCreatorCollectionAddress(creatorAddress);
      if (existingOnChain) {
        collectionAddress = existingOnChain;
      } else {
        // Get bytecode and factory owner private key
        const bytecode = getCollectionBytecode();
        const factoryOwnerPrivateKey = process.env.FACTORY_OWNER_PRIVATE_KEY;

        if (!bytecode || !factoryOwnerPrivateKey) {
          throw new Error(
            "Factory deployment requires COLLECTION_BYTECODE and FACTORY_OWNER_PRIVATE_KEY environment variables"
          );
        }

        // Create wallet client with factory owner account
        const account = privateKeyToAccount(factoryOwnerPrivateKey as `0x${string}`);
        const rpcUrl = getStoryRpcUrl();
        const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
        const chainId = network === "mainnet" ? 1514 : 1315;

        const walletClient = createWalletClient({
          account,
          chain: {
            id: chainId,
            name: network === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)",
            nativeCurrency: {
              name: "IP Token",
              symbol: "IP",
              decimals: 18,
            },
            rpcUrls: {
              default: {
                http: [rpcUrl],
              },
            },
          },
          transport: http(rpcUrl),
        });

        // Deploy collection via factory
        const result = await deployCreatorCollection(
          walletClient,
          creatorAddress,
          collectionName,
          collectionSymbol,
          bytecode
        );

        collectionAddress = result.collectionAddress;
      }
    } catch (factoryError) {
      serverLogger.warn("Factory deployment failed, falling back to SPG:", factoryError);
      // Fallback to SPG if factory deployment fails
      const result = await createCollection(client, {
        name: collectionName,
        symbol: collectionSymbol,
        owner: creatorAddress, // CRITICAL: Creator owns the collection
        mintFeeRecipient: creatorAddress, // Creator receives mint fees
      });
      collectionAddress = result.collectionAddress;
    }
  } else {
    // Factory not configured, use SPG
    serverLogger.debug(`Creating new collection via SPG for creator ${creatorAddress}...`, {
      owner: creatorAddress, // Creator owns from day one
      signer: (client as any).config?.account, // Platform signs (pays gas)
    });
    
    const result = await createCollection(client, {
      name: collectionName,
      symbol: collectionSymbol,
      owner: creatorAddress, // CRITICAL: Creator owns the collection
      mintFeeRecipient: creatorAddress, // Creator receives mint fees
    });

    collectionAddress = result.collectionAddress;
  }

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
    serverLogger.warn("Collection upsert failed (likely race condition), retrieving existing collection:", upsertError);

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

