"use client";

import { useEffect, useRef } from "react";
import type { Src } from "@livepeer/react";
import { Player, PlayerLoading } from "@/components/Player/Player";
import { TVCastControls } from "@/components/tv/TVCastControls";

type TVPlayerShellProps = {
  sources: Src[] | null;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  playbackId?: string;
  assetId?: string;
  jwt?: string;
  isLive?: boolean;
  surface: "tv-discover" | "tv-watch" | "tv-live";
  loading?: boolean;
};

export function TVPlayerShell({
  sources,
  title,
  subtitle,
  posterUrl,
  playbackId,
  assetId,
  jwt,
  isLive,
  surface,
  loading,
}: TVPlayerShellProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const video = containerRef.current?.querySelector("video");
    if (video) videoRef.current = video;
  }, [sources]);

  if (loading || !sources) {
    return (
      <div className="tv-player-shell aspect-video w-full">
        <PlayerLoading title="Loading…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="tv-player-shell aspect-video w-full">
        <Player
          src={sources}
          title={title}
          playbackId={playbackId}
          assetId={assetId}
          jwt={jwt}
          autoPlay
          lowLatency={Boolean(isLive)}
        />
      </div>
      <TVCastControls
        sources={sources}
        title={title}
        subtitle={subtitle}
        posterUrl={posterUrl}
        isLive={isLive}
        playbackId={playbackId}
        assetId={assetId}
        surface={surface}
        videoRef={videoRef}
      />
    </div>
  );
}
