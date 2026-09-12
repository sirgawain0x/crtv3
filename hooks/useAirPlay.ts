"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import {
  getAirPlayAvailability,
  isAirPlaySupported,
  showAirPlayPicker,
  type AirPlayAvailability,
  type AirPlayCapableVideo,
} from "@/lib/cast/airplay";
import { trackTVEvent } from "@/lib/analytics/tv-events";

type UseAirPlayOptions = {
  surface?: "tv-discover" | "tv-watch" | "tv-live";
  playbackId?: string;
  assetId?: string;
  title?: string;
};

export function useAirPlay(videoRef: RefObject<HTMLVideoElement | null>, options: UseAirPlayOptions = {}) {
  const [isSupported] = useState(() => isAirPlaySupported());
  const [availability, setAvailability] = useState<AirPlayAvailability>("unknown");

  useEffect(() => {
    const video = videoRef.current as AirPlayCapableVideo | null;
    if (!video || !isSupported) return;

    const onAvailability = () => {
      setAvailability(getAirPlayAvailability(video));
    };

    video.addEventListener("webkitplaybacktargetavailabilitychanged", onAvailability);
    onAvailability();

    return () => {
      video.removeEventListener("webkitplaybacktargetavailabilitychanged", onAvailability);
    };
  }, [isSupported, videoRef]);

  const openAirPlay = useCallback(() => {
    const video = videoRef.current as AirPlayCapableVideo | null;
    try {
      const opened = showAirPlayPicker(video);
      if (opened) {
        trackTVEvent({
          event: "airplay_start",
          castType: "airplay",
          surface: options.surface,
          playbackId: options.playbackId,
          assetId: options.assetId,
          title: options.title,
        });
      }
      return opened;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AirPlay picker failed";
      trackTVEvent({
        event: "airplay_error",
        castType: "airplay",
        surface: options.surface,
        playbackId: options.playbackId,
        assetId: options.assetId,
        title: options.title,
        errorMessage: message,
      });
      return false;
    }
  }, [options.assetId, options.playbackId, options.surface, options.title, videoRef]);

  return {
    isSupported,
    availability,
    isAvailable: availability === "available",
    openAirPlay,
  };
}
