import { Livepeer } from 'livepeer';

export const livepeer = new Livepeer({
  apiKey: process.env.LIVEPEER_API_KEY,
});

export async function getSourceForPlaybackId(id: any) {
  const response = await livepeer.playback.get(id);
  console.log('client page', response);

  // the return value can be passed directly to the Player as `src`
  return response;
}
