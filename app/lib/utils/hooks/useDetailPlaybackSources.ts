import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { getSrc } from '@livepeer/react/external';
import { Src } from '@livepeer/react';

export const getDetailPlaybackSource = async (
  id: string,
): Promise<Src[] | null> => {
  try {
    console.log('Fetching detailed playback sources...')
    const res = await fullLivepeer.playback.get(id);
    if (res.statusCode !== 200) {
      console.error('Error fetching playback sources: ', res?.error);
    }
    console.log('Playback info: ', res?.playbackInfo);
    const src = getSrc(res?.playbackInfo) as Src[];
    console.log('Source: ', src);
    return src;
  } catch (error) {
    console.error('Error fetching playback source:', error);
    return null;
  }
};