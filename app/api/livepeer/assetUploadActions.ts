"use server";

import {
  Type,
  InputCreatorIdType,
  type Asset,
} from "livepeer/models/components";
import {
  FrameWorksUploadsAssetsUnavailableError,
  requireVideoProviderForUploadsAndAssets,
} from "@/lib/video-provider";
import { WebhookContext } from "./token-gate/route";
import { serverLogger } from "@/lib/utils/logger";

export const getLivepeerUploadUrl = async (
  fileName: string,
  creatorAddress: string,
  tokenId?: string,
  contractAddress?: string,
  tokenGated: boolean = false
): Promise<{ asset?: Asset; tusEndpoint?: string } | undefined> => {
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

  const result = (await requireVideoProviderForUploadsAndAssets(
    "assetUploadActions.getLivepeerUploadUrl",
  ).assets.create(createAssetBody)) as {
    data?: unknown;
  };

  return result.data as { asset?: Asset; tusEndpoint?: string } | undefined;
};

export const getLivepeerAsset = async (
  livePeerAssetId: string,
): Promise<Asset> => {
  try {
    if (!livePeerAssetId) {
      throw new Error('Asset ID is required');
    }

    const result = (await requireVideoProviderForUploadsAndAssets(
      "assetUploadActions.getLivepeerAsset",
    ).assets.getById(livePeerAssetId)) as {
      asset?: unknown;
    } | null;

    if (!result?.asset) {
      serverLogger.error('No asset found in result:', result);
      throw new Error('Asset not found or invalid response from Livepeer');
    }

    return result.asset as Asset;
  } catch (error: unknown) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) throw error;
    const err = error as { message?: string; statusCode?: number };
    serverLogger.error('Error fetching Livepeer asset:', {
      assetId: livePeerAssetId,
      error: err?.message,
      statusCode: err?.statusCode,
    });
    throw new Error(err?.message || 'Failed to fetch video asset');
  }
};

export const getLivepeerPlaybackInfo = async (playbackId: string) => {
  const result = await requireVideoProviderForUploadsAndAssets(
    "assetUploadActions.getLivepeerPlaybackInfo",
  ).playback.get(playbackId);
  return result.playbackInfo as import("livepeer/models/components").PlaybackInfo | undefined;
};
