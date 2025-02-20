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
  try {
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
      if (!creatorAddress) throw new Error('Creator address is required for token gated assets');
      if (!tokenId) throw new Error('Token ID is required for token gated assets');
      if (!contractAddress) throw new Error('Token contract address is required for token gated assets');

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

    console.log('Creating Livepeer asset with:', { fileName, creatorAddress, tokenGated });
    const result = await fullLivepeer.asset.create(createAssetBody);
    console.log('Livepeer asset created:', result);

    return result.data;
  } catch (error: any) {
    console.error('Error creating Livepeer asset:', {
      error: error.message,
      details: error.response?.data,
      fileName,
      creatorAddress
    });
    throw new Error(`Failed to create Livepeer asset: ${error.message}`);
  }
};

export const getLivepeerAsset = async (livePeerAssetId: string) => {
  const result = await fullLivepeer.asset.get(livePeerAssetId);

  return result.asset;
};

export const getLivepeerPlaybackInfo = async (playbackId: string) => {
  const result = await fullLivepeer.playback.get(playbackId);

  return result.playbackInfo;
};
