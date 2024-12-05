'use server';

import { getJwtContext } from '@app/api/auth/thirdweb/authentication';
import { validateAccessKey } from '@app/lib/access-key';
import { NextRequest, NextResponse } from 'next/server';
import { useActiveAccount } from 'thirdweb/react';

export interface WebhookPayload {
  accessKey: string;
  context: WebhookContext;
  timestamp: number;
}

export interface WebhookContext {
  creatorAddress: string;
  tokenId: string;
  contractAddress: string;
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

  // 1. Validate access key
  if (!address && !validateAccessKey(accessKey, address, context)) {
    return false;
  }

  // 2. Check user-specific conditions
  if (!context?.tokenId || !context.contractAddress) {
    return false;
  }
  const userHasToken = await checkUserTokenBalances(address, context.tokenId, context.contractAddress);
  if (!userHasToken) {
    return false;
  }

  // 3. Asset or stream-specific checks
  if (context.tokenId && context.contractAddress) {
    // Check if asset is not restricted
    const isAssetAccessible = await checkAssetAccessibility(context.tokenId, context.contractAddress);
    if (!isAssetAccessible) {
      return false;
    }
  }

  return true;
}

async function checkUserTokenBalances(address: string, tokenId: string, contractAddress: string): Promise<boolean> {
  // TODO: map tokenId to tokenId in ERC1155 contract and check balance.
  // For example, use tokenId if possible, otherwise, use a mapping
  // stored in a orbisDB.
  return true;
}

async function checkAssetAccessibility(tokenId: string, contractAddress: string): Promise<boolean> {
  // Implement actual asset accessibility checking logic
  // For example, check if asset is published or not restricted
  return true;
}