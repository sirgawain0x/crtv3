import { getSrc } from "@livepeer/react/external";
import { Src } from "@livepeer/react";
import { LIVEPEER_HERO_PLAYBACK_ID, HERO_VIDEO_ASSET_ID } from "../../../context/context";
import { logger } from '@/lib/utils/logger';


export const getHeroPlaybackSource = async (): Promise<Src[] | null> => {
  try {
    // First, try to fetch the asset by asset ID via our API route (server-side, avoids CORS)
    let playbackId: string | null = null;
    
    if (HERO_VIDEO_ASSET_ID) {
      try {
        const response = await fetch(`/api/livepeer/asset/${HERO_VIDEO_ASSET_ID}`);
        if (response.ok) {
          const assetResponse = await response.json();
          if (assetResponse?.asset?.playbackId) {
            playbackId = assetResponse.asset.playbackId;
          }
        } else {
          logger.warn(`Failed to fetch hero video asset: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        logger.warn("Error fetching hero video asset by ID, falling back to default playback ID:", error);
      }
    }
    
    // Fallback to default playback ID if asset fetch failed
    if (!playbackId) {
      playbackId = LIVEPEER_HERO_PLAYBACK_ID;
    }
    
    // Fetch playback info via our API route (server-side, avoids CORS)
    const playbackResponse = await fetch(`/api/livepeer/playback-info?playbackId=${playbackId}`);
    if (!playbackResponse.ok) {
      throw new Error(`Failed to fetch playback info: ${playbackResponse.status} ${playbackResponse.statusText}`);
    }
    
    const playbackInfo = await playbackResponse.json();
    const src = getSrc(playbackInfo?.playbackInfo) as Src[];
    return src;
  } catch (error) {
    logger.error("Error fetching playback source:", error);
    return null;
  }
};
