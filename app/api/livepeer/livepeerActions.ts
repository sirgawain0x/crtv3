'use server';

import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { InputCreatorIdType, Webhook } from 'livepeer/models/components';
import { Type } from 'livepeer/models/components';
import { WebhookContext } from './token-gate/route';
import { useActiveAccount } from 'thirdweb/react';

// TODO: Add playback policy - https://docs.livepeer.org/developers/tutorials/token-gate-videos-with-lit
export const getLivepeerUploadUrl = async (
  fileName: string,
  creatorAddress: string,
  tokenGated: boolean = false,
  // activeAccount?: ReturnType<typeof useActiveAccount>,
  assetId?: string // Only required for tokenGated assets
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

    if (!creatorAddress) {
      throw new Error('Active account is required for token gated assets');
    }

    createAssetBody.playbackPolicy = {
      type: Type.Webhook,
      webhookId: process.env.LIVEPEER_WEBHOOK_ID || '',
      webhookContext: {
        assetId: assetId,
        address: creatorAddress,
      },
    };

  }

  const result = await fullLivepeer.asset.create(createAssetBody);

  return result.data;
};

export const getLivepeerAsset = async (livePeerAssetId: string) => {
  const result = await fullLivepeer.asset.get(livePeerAssetId);

  return result.asset;
};

export const getLivepeerPlaybackInfo = async (playbackId: string) => {
  const result = await fullLivepeer.playback.get(playbackId);

  return result.playbackInfo;
};
