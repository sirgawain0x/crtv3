"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isChromecastAvailable,
  loadChromecastSdk,
  startChromecastSession,
  type CastMediaPayload,
} from "@/lib/cast/chromecast";
import { trackTVEvent } from "@/lib/analytics/tv-events";

type UseChromecastOptions = {
  surface?: "tv-discover" | "tv-watch" | "tv-live";
  playbackId?: string;
  assetId?: string;
};

export function useChromecast(options: UseChromecastOptions = {}) {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadChromecastSdk().then((ready) => {
      if (cancelled) return;
      setIsSdkReady(ready);
      setIsCastAvailable(ready && isChromecastAvailable());
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const castMedia = useCallback(
    async (payload: CastMediaPayload) => {
      try {
        setIsCasting(true);
        await startChromecastSession(payload);
        trackTVEvent({
          event: "cast_start",
          castType: "chromecast",
          surface: options.surface,
          playbackId: options.playbackId,
          assetId: options.assetId,
          title: payload.title,
          contentUrl: payload.contentUrl,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Chromecast failed to start";
        trackTVEvent({
          event: "cast_error",
          castType: "chromecast",
          surface: options.surface,
          playbackId: options.playbackId,
          assetId: options.assetId,
          title: payload.title,
          errorMessage: message,
        });
        throw error;
      } finally {
        setIsCasting(false);
      }
    },
    [options.assetId, options.playbackId, options.surface],
  );

  return {
    isSdkReady,
    isCastAvailable,
    isCasting,
    castMedia,
  };
}
