import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { GetAssetsResponse } from 'livepeer/models/operations';

export const getAllPlaybackSources =
  async (): Promise<GetAssetsResponse | null> => {
    try {
      const playbackSources: GetAssetsResponse =
        await fullLivepeer.asset.getAll();
      return playbackSources;
    } catch (error) {
      console.error('Error fetching playback sources:', error);
      return null;
    }
  };