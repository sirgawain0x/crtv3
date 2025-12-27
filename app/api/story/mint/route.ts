/**
 * API Route for Story Protocol NFT Minting
 * 
 * This API route handles Story Protocol transactions using a private key
 * since Story Protocol only supports eth_sendRawTransaction (not eth_sendTransaction).
 * 
 * IMPORTANT: Requires STORY_PROTOCOL_PRIVATE_KEY environment variable
 * This should be a private key for a wallet that has IP tokens for gas fees on Story Protocol
 */

import { NextRequest, NextResponse } from "next/server";
import { createCollectionAndMintVideoNFTOnStory } from "@/lib/sdk/nft/minting-service";
import type { Address } from "viem";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      creatorAddress,
      recipient,
      metadataURI,
      collectionName,
      collectionSymbol,
    } = body;

    // Validate required fields
    if (!creatorAddress || !recipient || !metadataURI || !collectionName || !collectionSymbol) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Story Protocol requires transactions to be signed locally (eth_sendRawTransaction)
    // The SDK needs a private key to sign transactions
    // 
    // IMPORTANT: The private key must be for the creator's address (creatorAddress)
    // This is a security concern - in production, consider:
    // 1. Using a dedicated service wallet that mints on behalf of users
    // 2. Implementing a secure key management system
    // 3. Using browser wallet extensions for user-controlled signing
    
    const privateKey = process.env.STORY_PROTOCOL_PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json(
        { 
          error: "Story Protocol private key not configured",
          hint: "Set STORY_PROTOCOL_PRIVATE_KEY environment variable. " +
                "This should be the private key for a wallet that has IP tokens for gas fees on Story Protocol. " +
                "For production, consider using a dedicated service wallet."
        },
        { status: 500 }
      );
    }

    // Get the funding wallet address from the private key
    // The Story Protocol SDK needs the account address to match the private key
    // for proper signing. The funding wallet pays for transactions.
    let fundingWalletAddress: Address;
    try {
      const { privateKeyToAccount } = await import("viem/accounts");
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      fundingWalletAddress = await account.address;
      
      console.log("📝 Using funding wallet for Story Protocol transactions:", {
        fundingWallet: fundingWalletAddress,
        creatorAddress: creatorAddress,
        recipient: recipient,
      });
      
      // Note: The funding wallet address doesn't need to match the creator address
      // The funding wallet pays for gas, but the creator/recipient are used for NFT ownership
    } catch (e) {
      console.error("Could not get funding wallet address from private key:", e);
      return NextResponse.json(
        { 
          error: "Invalid private key",
          hint: "The STORY_PROTOCOL_PRIVATE_KEY environment variable contains an invalid private key."
        },
        { status: 500 }
      );
    }

    // Create and mint using the funding wallet address and private key for signing
    // The SDK will use the funding wallet to sign and send transactions
    // but the creator/recipient addresses determine NFT ownership
    const result = await createCollectionAndMintVideoNFTOnStory(
      fundingWalletAddress, // Use funding wallet address for SDK account (must match private key for signing)
      recipient as Address,
      metadataURI,
      collectionName,
      collectionSymbol,
      undefined, // No custom transport needed
      undefined, // No license params for now
      privateKey, // Use private key for signing
      creatorAddress as Address // Creator address for collection ownership
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Story Protocol minting error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to mint on Story Protocol",
      },
      { status: 500 }
    );
  }
}

