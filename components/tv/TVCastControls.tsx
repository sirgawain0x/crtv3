"use client";

import { useCallback, useState } from "react";
import type { Src } from "@livepeer/react";
import { Cast, Airplay } from "lucide-react";
import { useChromecast } from "@/hooks/useChromecast";
import { useAirPlay } from "@/hooks/useAirPlay";
import { extractHlsPlaybackUrl, isHttpsCastableUrl } from "@/lib/cast/extract-playback-url";

type TVCastControlsProps = {
  sources: Src[] | null;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  isLive?: boolean;
  playbackId?: string;
  assetId?: string;
  surface?: "tv-discover" | "tv-watch" | "tv-live";
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

export function TVCastControls({
  sources,
  title,
  subtitle,
  posterUrl,
  isLive,
  playbackId,
  assetId,
  surface,
  videoRef,
}: TVCastControlsProps) {
  const { isCastAvailable, isCasting, castMedia } = useChromecast({
    surface,
    playbackId,
    assetId,
  });
  const { isSupported: airPlaySupported, isAvailable: airPlayAvailable, openAirPlay } =
    useAirPlay(videoRef, { surface, playbackId, assetId, title });
  const [castError, setCastError] = useState<string | null>(null);

  const contentUrl = extractHlsPlaybackUrl(sources);
  const canCastUrl = Boolean(contentUrl && isHttpsCastableUrl(contentUrl));

  const handleChromecast = useCallback(async () => {
    if (!contentUrl) {
      setCastError("No playable stream found");
      return;
    }
    setCastError(null);
    try {
      await castMedia({
        contentUrl,
        title,
        subtitle,
        posterUrl,
        isLive,
      });
    } catch (error) {
      setCastError(
        error instanceof Error ? error.message : "Unable to start casting",
      );
    }
  }, [castMedia, contentUrl, isLive, posterUrl, subtitle, title]);

  const showChromecast = isCastAvailable && canCastUrl;
  const showAirPlay = airPlaySupported && (airPlayAvailable || airPlaySupported);

  if (!showChromecast && !showAirPlay) return null;

  return (
    <div className="tv-cast-bar" role="group" aria-label="Cast to your TV">
      {showChromecast ? (
        <button
          type="button"
          className="tv-cast-button tv-focusable"
          onClick={() => void handleChromecast()}
          disabled={isCasting}
          aria-label="Cast to Chromecast"
        >
          <Cast className="h-6 w-6" aria-hidden />
          {isCasting ? "Connecting…" : "Cast"}
        </button>
      ) : null}
      {showAirPlay ? (
        <button
          type="button"
          className="tv-cast-button tv-focusable"
          onClick={() => openAirPlay()}
          aria-label="AirPlay"
        >
          <Airplay className="h-6 w-6" aria-hidden />
          AirPlay
        </button>
      ) : null}
      {castError ? (
        <p className="text-sm text-amber-300" role="status">{castError}</p>
      ) : null}
    </div>
  );
}
