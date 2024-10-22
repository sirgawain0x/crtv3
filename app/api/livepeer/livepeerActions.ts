'use server';

import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { InputCreatorIdType } from 'livepeer/models/components';

export const getLivepeerUploadUrl = async (
  fileName: string,
  creatorAddress: string,
) => {
  const result = await fullLivepeer.asset.create({
    name: fileName,
    storage: {
      ipfs: true,
    },
    creatorId: {
      type: InputCreatorIdType?.Unverified,
      value: creatorAddress,
    },
  });

  return result.data;
};

export const giveLivePeerAsset = async (livePeerAssetId: string) => {
  const result = await fullLivepeer.asset.get(livePeerAssetId);

  return result.asset;
};

export const getLivePeerPlaybackInfo = async (playbackId: string) => {
  const result = await fullLivepeer.playback.get(playbackId);

  return result.playbackInfo;
};
