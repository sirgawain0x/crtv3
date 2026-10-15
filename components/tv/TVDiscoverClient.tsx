"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { resolveCreativeTVPlayback } from "@/lib/utils/resolve-creative-tv-playback";
import type { Src } from "@livepeer/react";
import { TVPlayerShell } from "@/components/tv/TVPlayerShell";
import { startTVSessionTracker } from "@/lib/analytics/tv-events";

type TVDiscoverClientProps = {
  assetId: string;
};

export function TVDiscoverClient({ assetId }: TVDiscoverClientProps) {
  const [sources, setSources] = useState<Src[] | null>(null);
  const [title, setTitle] = useState("Creative TV");
  const [posterUrl, setPosterUrl] = useState<string | undefined>();
  const [playbackId, setPlaybackId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stop = startTVSessionTracker("tv-discover");
    return stop;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await resolveCreativeTVPlayback(`/discover/${assetId}`);
      if (cancelled) return;

      if (!result.ok) {
        setError(result.message ?? "This video is unavailable.");
        setLoading(false);
        return;
      }

      if (result.requiresMetoken) {
        setError(
          "This video requires access from your phone. Open Creative TV on your mobile device to continue.",
        );
        setLoading(false);
        return;
      }

      setTitle(result.title ?? "Creative TV");
      setPosterUrl(result.thumbnailUri);
      setPlaybackId(result.playbackId);

      try {
        const playbackSources = await getDetailPlaybackSource(result.playbackId);
        if (!cancelled) {
          if (!playbackSources?.length) {
            setError("Playback is unavailable right now.");
          } else {
            setSources(playbackSources);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Playback is unavailable right now.");
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tv" className="tv-focusable rounded-lg px-4 py-2 text-lg text-white/80 hover:text-white">
          ← Home
        </Link>
      </div>

      {error ? (
        <div className="tv-card rounded-2xl p-10 text-center">
          <h1 className="mb-4">{title}</h1>
          <p className="text-xl text-white/80">{error}</p>
        </div>
      ) : (
        <>
          <h1 className="mb-6">{title}</h1>
          <TVPlayerShell
            sources={sources}
            title={title}
            posterUrl={posterUrl}
            playbackId={playbackId}
            assetId={assetId}
            surface="tv-discover"
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
