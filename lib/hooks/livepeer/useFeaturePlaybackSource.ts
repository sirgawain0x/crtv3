import type { Src } from '@livepeer/react';
import { getHeroPlaybackSource } from './useHeroPlaybackSource';
/** Use the owned, archived homepage asset through the selected server provider. */
export async function getFeaturedPlaybackSource(): Promise<Src[]> {
  return (await getHeroPlaybackSource())?.src ?? [];
}
