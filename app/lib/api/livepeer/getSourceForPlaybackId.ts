import { livepeer } from '@app/lib/sdk/livepeer/client'
import { getSrc } from "@livepeer/react/external";

export async function getSourceForPlaybackId(playbackId: string) {
  const response = await livepeer.playback.get(playbackId);

  // the return value can be passed directly to the Player as `src`
  return getSrc(response.playbackInfo);
}
