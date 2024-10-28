import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { getSrc } from '@livepeer/react/external';
import { Src } from '@livepeer/react';

export const getDetailPlaybackSource = async (
  id: string,
): Promise<Src[] | null> => {
  try {
    const playbackInfo = await fullLivepeer.playback.get(id);
    const src = getSrc(playbackInfo?.playbackInfo) as Src[];
    return src;
  } catch (error) {
    console.error('Error fetching playback source:', error);
    return null;
  }
};
