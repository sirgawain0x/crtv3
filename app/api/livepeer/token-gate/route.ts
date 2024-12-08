'use server';

import { NextRequest, NextResponse } from 'next/server';

import { getContract } from 'thirdweb';
import { balanceOf as balanceOfERC1155 } from "thirdweb/extensions/erc1155";

import { client } from '@app/lib/sdk/thirdweb/client';
import { validateAccessKey } from '@app/lib/access-key';
import { getJwtContext } from '@app/api/auth/thirdweb/authentication';
import { defineChain } from 'thirdweb';


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
    // Parse the incoming JSON payload
    const payload: WebhookPayload = await request.json();

    if (!payload.accessKey || !payload.context || !payload.timestamp) {
      return NextResponse.json({ 
        allowed: false,
        message: 'Bad request, missing required fields' 
      }, { status: 400 });
    }

    // Implement your custom access control logic here
    const isAccessAllowed = await validateAccess(payload);

    if (isAccessAllowed) {
      // Access granted
      return NextResponse.json({ 
        allowed: true,
        message: 'Access granted' 
      }, { status: 200 });
    } else {
      // Access denied
      return NextResponse.json({ 
        allowed: false,
        message: 'Access denied' 
      }, { status: 403 });
    }
  } catch (error) {
    console.error('Access control error:', error);
    return NextResponse.json({ 
      allowed: false,
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

async function validateAccess(payload: WebhookPayload): Promise<boolean> {
  const { accessKey, context, timestamp } = payload;

  const { address } = await getJwtContext();

  // 1. Validate WebhookContext
  if (!address || !context?.tokenId || !context.contractAddress || !context.chain) {
    return false;
  }
  
  // 2. Validate access key
  if (!validateAccessKey(accessKey, address, context)) {
    return false;
  }

  // 3. Check user-specific conditions
  const userHasToken = await checkUserTokenBalances(address, context);
  if (!userHasToken) {
    return false;
  }

  // 4. Asset or stream-specific checks
  const isAssetAccessible = await checkAssetAccessibility(context);
  if (!isAssetAccessible) {
    return false;
  }

  return true;
}

async function checkUserTokenBalances(address: string, context: WebhookContext): Promise<boolean> {
  const videoTokenContract = getContract({
    address: context.contractAddress,
    chain: defineChain(context.chain),
    client,
  });

  const videoTokenBalance = await balanceOfERC1155({
    contract: videoTokenContract,
    tokenId: BigInt(context.tokenId),
    owner: address,
  });

  return videoTokenBalance > 0n;
}

async function checkAssetAccessibility(context: WebhookContext): Promise<boolean> {
  // Implement actual asset accessibility checking logic
  // For example, check if asset is published or not restricted
  return true;
}