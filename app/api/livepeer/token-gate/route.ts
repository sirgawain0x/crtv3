"use server";

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, Address } from "viem";
import { alchemy, base } from "@account-kit/infra";
import type { Chain } from "viem";
import { generateAccessKey, validateAccessKey } from "@/lib/access-key";
import { getSmartAccountClient } from "@account-kit/core";
import { config } from "@/config";

// Import ERC1155 ABI
const erc1155ABI = [
  {
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Define chain mapping (Base only)
const chainMapping: Record<number, Chain> = {
  8453: base,
};

export interface WebhookPayload {
  accessKey: string;
  context: WebhookContext;
  timestamp: number;
}

export interface WebhookContext {
  creatorAddress: string;
  tokenId: string;
  contractAddress: string;
  chain: number;
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();

    console.log({ payload });

    if (
      !payload.accessKey ||
      !payload.context.creatorAddress ||
      !payload.context.tokenId ||
      !payload.context.contractAddress ||
      !payload.context.chain ||
      !payload.timestamp
    ) {
      return NextResponse.json(
        {
          allowed: false,
          message: "Bad request, missing required fields",
        },
        { status: 400 }
      );
    }

    // Validate timestamp age < 5 minutes
    const MAX_TIMESTAMP_AGE = 5 * 60 * 1000;
    const now = Date.now();

    if (Math.abs(now - payload.timestamp) > MAX_TIMESTAMP_AGE) {
      return NextResponse.json(
        {
          allowed: false,
          message: "Request timestamp too old or from future",
        },
        { status: 400 }
      );
    }

    // Implement custom access control logic here
    const isAccessAllowed = await validateAccess(payload);

    console.log({ isAccessAllowed });

    if (isAccessAllowed) {
      return NextResponse.json(
        {
          allowed: true,
          message: "Access granted",
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          allowed: false,
          message: "Access denied",
        },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Access control error:", error);
    return NextResponse.json(
      {
        allowed: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address") as string;
    const creatorAddress = request.nextUrl.searchParams.get(
      "creatorAddress"
    ) as string;
    const tokenId = request.nextUrl.searchParams.get("tokenId") as string;
    const contractAddress = request.nextUrl.searchParams.get(
      "contractAddress"
    ) as string;
    const chain = parseInt(request.nextUrl.searchParams.get("chain") as string);

    console.log({
      address,
      creatorAddress,
      tokenId,
      contractAddress,
      chain,
    });

    if (!address /* || !context */) {
      return NextResponse.json(
        {
          allowed: false,
          message: "Bad request, missing required fields",
        },
        { status: 400 }
      );
    }

    const accessKey = generateAccessKey(address, {
      type: "token-gate",
      rules: {
        chain,
        contractAddress,
        tokenId,
        creatorAddress,
      },
    });

    console.log({ accessKey });

    if (accessKey) {
      return NextResponse.json(
        {
          allowed: true,
          accessKey: accessKey,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          allowed: false,
          message: "Failed to generate access key.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Generate access key error:", error);
    return NextResponse.json(
      {
        allowed: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

async function validateAccess(payload: WebhookPayload): Promise<boolean> {
  const { accessKey, context, timestamp } = payload;

  try {
    // Get the smart account client
    const client = await getSmartAccountClient(
      {
        type: "ModularAccountV2",
        accountParams: {
          mode: "default",
        },
      },
      config
    );

    if (!client || !client.address) return false;

    // Validate the access key
    const isValidKey = validateAccessKey(accessKey, client.address, {
      type: "token-gate",
      rules: {
        chain: context.chain,
        contractAddress: context.contractAddress,
        tokenId: context.tokenId,
        creatorAddress: context.creatorAddress,
      },
    });
    if (!isValidKey) return false;

    // Check if user has required token balance
    const hasTokens = await checkUserTokenBalances(client.address, context);
    if (!hasTokens) return false;

    // Check if the asset is accessible
    const isAccessible = await checkAssetAccessibility(context);
    if (!isAccessible) return false;

    return true;
  } catch (error) {
    console.error("Validate access error:", error);
    return false;
  }
}

async function checkUserTokenBalances(
  address: string,
  context: WebhookContext
): Promise<boolean> {
  try {
    // Get the chain we are using
    const chain = chainMapping[context.chain];

    // If the chain is not supported, return false
    if (!chain) {
      console.error("Chain not supported");
      return false;
    }

    // Get a public client for the chain
    const publicClient = createPublicClient({
      chain,
      transport: alchemy({
        apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
      }),
    });

    // Check the user token balance
    const videoTokenBalance = (await publicClient.readContract({
      address: context.contractAddress as Address,
      abi: erc1155ABI,
      functionName: "balanceOf",
      args: [address as Address, BigInt(context.tokenId)],
    })) as bigint;

    console.log({ videoTokenBalance });

    return videoTokenBalance > BigInt(0);
  } catch (error) {
    console.error("Error checking token balances...", error);
    return false;
  }
}

async function checkAssetAccessibility(
  context: WebhookContext
): Promise<boolean> {
  // Implement actual asset accessibility checking logic
  // For example, check if asset is published or not restricted
  return true;
}
