/**
 * API Route to get the Story Protocol funding wallet address
 * 
 * This endpoint returns the address of the wallet that has STORY_PROTOCOL_PRIVATE_KEY
 * Users need to transfer IP tokens to this address to fund Story Protocol transactions
 */

import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { serverLogger } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
  try {
    const privateKey = process.env.STORY_PROTOCOL_PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json(
        { 
          error: "Story Protocol private key not configured",
          hint: "Set STORY_PROTOCOL_PRIVATE_KEY environment variable."
        },
        { status: 500 }
      );
    }

    // Get the address from the private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const address = await account.address;

    return NextResponse.json({
      success: true,
      address,
    });
  } catch (error) {
    serverLogger.error("Error getting funding wallet address:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get funding wallet address",
      },
      { status: 500 }
    );
  }
}

