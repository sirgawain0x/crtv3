import { validateAccessKey } from '@app/lib/access-key';
import { NextRequest, NextResponse } from 'next/server';
import { useActiveAccount } from 'thirdweb/react';

export interface WebhookPayload {
  accessKey: string;
  context: WebhookContext;
  timestamp: number;
}

export interface WebhookContext {
  assetId?: string;
  address?: string;
  subscriptionLevel?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the incoming JSON payload
    const payload: WebhookPayload = await request.json();

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
  const activeAccount = useActiveAccount();
  const { accessKey, context } = payload;

  // 1. Validate access key 
  if (activeAccount?.address && context.assetId && !validateAccessKey(accessKey, activeAccount?.address, context.assetId)) {
    return false;
  }

  // 2. Check user-specific conditions
  if (activeAccount) {
    // Check if user has tokens 
    if (!activeAccount || !context?.assetId) {
      return false;
    }
    const userSubscription = await checkUserTokenBalances(activeAccount.address, context.assetId);
    if (!userSubscription) {
      return false;
    }
  }

  // 3. Asset or stream-specific checks
  if (context.assetId) {
    // Check if asset is not restricted
    const isAssetAccessible = await checkAssetAccessibility(context.assetId);
    if (!isAssetAccessible) {
      return false;
    }
  }

  return true;
}

async function checkUserTokenBalances(activeAddress: string, assetId: string): Promise<boolean> {
  // TODO: map assetId to tokenId in ERC1155 contract and check balance.
  // For example, use assetId as tokenId if possible, otherwise, use a mapping
  // stored in a orbisDB.
  return true;
}

async function checkAssetAccessibility(assetId: string): Promise<boolean> {
  // Implement actual asset accessibility checking logic
  // For example, check if asset is published or not restricted
  return true;
}