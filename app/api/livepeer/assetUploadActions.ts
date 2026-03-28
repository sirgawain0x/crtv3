"use server";

import { Type, InputCreatorIdType } from "livepeer/models/components";
import { fullLivepeer } from "@/lib/sdk/livepeer/fullClient";
import { WebhookContext } from "./token-gate/route";
import { serverLogger } from "@/lib/utils/logger";

export const getLivepeerUploadUrl = async (
  fileName: string,
  creatorAddress: string,
  tokenId?: string,
  contractAddress?: string,
  tokenGated: boolean = false
) => {
  const createAssetBody: {
    name: string;
    storage: {
      ipfs: boolean;
    };
    creatorId: {
      type: InputCreatorIdType;
      value: string;
    };
    staticMp4?: boolean;
    playbackPolicy?: {
      type: Type;
      webhookId: string;
      webhookContext: WebhookContext;
    };
  } = {
    name: fileName,
    storage: {
      ipfs: true,
    },
    creatorId: {
      type: InputCreatorIdType?.Unverified,
      value: creatorAddress,
    },
    staticMp4: true, // Enable MP4 generation for downloadUrl and better compatibility
  };

  if (tokenGated) {
    if (!creatorAddress)
      throw new Error("Creator address is required for token gated assets");
    if (!tokenId)
      throw new Error("Token ID is required for token gated assets");
    if (!contractAddress)
      throw new Error(
        "Token contract address is required for token gated assets"
      );

    createAssetBody.playbackPolicy = {
      type: Type.Webhook,
      webhookId: process.env.LIVEPEER_WEBHOOK_ID as string,
      webhookContext: {
        creatorAddress,
        tokenId,
        contractAddress,
      } as WebhookContext,
    };
  }

  const result = await fullLivepeer.asset.create(createAssetBody);

  return result.data;
};

export const getLivepeerAsset = async (livePeerAssetId: string) => {
  try {
    if (!livePeerAssetId) {
      throw new Error('Asset ID is required');
    }

    const result = await fullLivepeer.asset.get(livePeerAssetId);

    if (!result?.asset) {
      serverLogger.error('No asset found in result:', result);
      throw new Error('Asset not found or invalid response from Livepeer');
    }

    return result.asset;
  } catch (error: any) {
    serverLogger.error('Error fetching Livepeer asset:', {
      assetId: livePeerAssetId,
      error: error?.message,
      statusCode: error?.statusCode,
    });
    throw new Error(error?.message || 'Failed to fetch video asset');
  }
};

export const getLivepeerPlaybackInfo = async (playbackId: string) => {
  const result = await fullLivepeer.playback.get(playbackId);

  return result.playbackInfo;
};
