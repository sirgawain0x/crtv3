import { Livepeer } from 'livepeer';
import { getSrc } from '@livepeer/react/external';

export const livepeer = new Livepeer({
  apiKey: `Bearer ${process.env.LIVEPEER_API_KEY}`,
});

export async function getSourceForPlaybackId(playbackId: string) {
  const response = await livepeer.playback.get(playbackId);

  // the return value can be passed directly to the Player as `src`
  return getSrc(response.playbackInfo);
}