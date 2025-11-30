import { fullLivepeer } from "../../sdk/livepeer/fullClient";
import { getSrc } from "@livepeer/react/external";
import { Src } from "@livepeer/react";
import { LIVEPEER_HERO_PLAYBACK_ID, HERO_VIDEO_ASSET_ID } from "../../../context/context";

export const getHeroPlaybackSource = async (): Promise<Src[] | null> => {
  try {
    // First, try to fetch the asset by asset ID
    let playbackId: string | null = null;
    
    if (HERO_VIDEO_ASSET_ID) {
      try {
        const assetResponse = await fullLivepeer.asset.get(HERO_VIDEO_ASSET_ID);
        if (assetResponse?.asset?.playbackId) {
          playbackId = assetResponse.asset.playbackId;
        }
      } catch (error) {
        console.warn("Error fetching hero video asset by ID, falling back to default playback ID:", error);
      }
    }
    
    // Fallback to default playback ID if asset fetch failed
    if (!playbackId) {
      playbackId = LIVEPEER_HERO_PLAYBACK_ID;
    }
    
    const playbackInfo = await fullLivepeer.playback.get(playbackId);
    const src = getSrc(playbackInfo?.playbackInfo) as Src[];
    return src;
  } catch (error) {
    console.error("Error fetching playback source:", error);
    return null;
  }
};
