"use client";

import { useEffect, useState } from "react";
import { Player, PlayerLoading } from "@/components/Player/Player";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { resolveCreativeTVPlayback } from "@/lib/utils/resolve-creative-tv-playback";
import type { Src } from "@livepeer/react";

type DiscoverEmbedPlayerProps = {
  assetId: string;
};

export function DiscoverEmbedPlayer({ assetId }: DiscoverEmbedPlayerProps) {
  const [playbackSources, setPlaybackSources] = useState<Src[] | null>(null);
  const [title, setTitle] = useState("Creative TV");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setPlaybackSources(null);

      const result = await resolveCreativeTVPlayback(`/discover/${assetId}`);
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.message ?? "Video unavailable");
        return;
      }

      if (result.requiresMetoken) {
        setError("Sign in on Creative TV to watch this video.");
        return;
      }

      setTitle(result.title ?? "Creative TV");

      try {
        const sources = await getDetailPlaybackSource(result.playbackId);
        if (!cancelled) {
          if (!sources?.length) {
            setError("Playback unavailable");
            return;
          }
          setPlaybackSources(sources);
        }
      } catch {
        if (!cancelled) {
          setError("Playback unavailable");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (error) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-black px-4 text-center text-sm text-white/80">
        {error}
      </div>
    );
  }

  if (!playbackSources) {
    return (
      <div className="aspect-video w-full bg-black">
        <PlayerLoading title="Loading video..." />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full bg-black">
      <Player src={playbackSources} title={title} />
    </div>
  );
}
