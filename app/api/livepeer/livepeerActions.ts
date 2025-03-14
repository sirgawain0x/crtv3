'use server';

import { Type, InputCreatorIdType } from 'livepeer/models/components';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { WebhookContext } from '@app/api/livepeer/token-gate/route';

export const getLivepeerUploadUrl = async (
  fileName: string,
  creatorAddress: string,
  tokenId?: string,
  contractAddress?: string,
  tokenGated: boolean = false,
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
  };

  if (tokenGated) {
    if (!creatorAddress)
      throw new Error('Creator address is required for token gated assets');
    if (!tokenId)
      throw new Error('Token ID is required for token gated assets');
    if (!contractAddress)
      throw new Error(
        'Token contract address is required for token gated assets',
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

  if (!result.data) {
    throw new Error('Failed to create asset: No data returned');
  }

  return {
    asset: result.data.asset
      ? {
          id: result.data.asset.id,
          name: result.data.asset.name,
          status: result.data.asset.status,
          playbackId: result.data.asset.playbackId,
          createdAt: result.data.asset.createdAt,
          storage: result.data.asset.storage,
        }
      : null,
    tusEndpoint: result.data.tusEndpoint,
  };
};

export const getLivepeerAsset = async (livePeerAssetId: string) => {
  const result = await fullLivepeer.asset.get(livePeerAssetId);

  if (!result.asset) {
    throw new Error('Asset not found');
  }

  return {
    id: result.asset.id,
    name: result.asset.name,
    status: result.asset.status,
    playbackId: result.asset.playbackId,
    createdAt: result.asset.createdAt,
    storage: result.asset.storage,
    source: result.asset.source || [],
  };
};

export const getLivepeerPlaybackInfo = async (playbackId: string) => {
  const result = await fullLivepeer.playback.get(playbackId);

  if (!result.playbackInfo) {
    throw new Error('Playback info not found');
  }

  if (!result.playbackInfo.meta) {
    throw new Error('Playback meta info not found');
  }

  return {
    type: result.playbackInfo.type,
    meta: {
      source: result.playbackInfo.meta.source || [],
      live: result.playbackInfo.meta.live,
      playbackPolicy: result.playbackInfo.meta.playbackPolicy,
      dvrPlayback: result.playbackInfo.meta.dvrPlayback,
      attestation: result.playbackInfo.meta.attestation,
    },
  };
};
