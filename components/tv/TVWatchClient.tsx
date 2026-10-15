"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Src } from "@livepeer/react";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { getStreamByPlaybackId } from "@/services/streams";
import { TVPlayerShell } from "@/components/tv/TVPlayerShell";
import { startTVSessionTracker } from "@/lib/analytics/tv-events";
import { isMeTokenGateActive } from "@/lib/utils/metoken-access";

type TVWatchClientProps = {
  playbackId: string;
};

/**
 * Living-room live watch: play-first without wallet modals.
 * MeToken-gated streams show a phone handoff message instead of blocking with Connect Wallet.
 */
export function TVWatchClient({ playbackId }: TVWatchClientProps) {
  const [sources, setSources] = useState<Src[] | null>(null);
  const [title, setTitle] = useState("Live");
  const [posterUrl, setPosterUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jwt, setJwt] = useState<string | undefined>();

  useEffect(() => {
    const stop = startTVSessionTracker("tv-live");
    return stop;
  }, []);

  const loadPlayback = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [sourcesResult, streamResult] = await Promise.allSettled([
      getDetailPlaybackSource(playbackId),
      getStreamByPlaybackId(playbackId),
    ]);

    const playbackSources =
      sourcesResult.status === "fulfilled" ? sourcesResult.value : null;
    const stream =
      streamResult.status === "fulfilled" ? streamResult.value : null;

    if (stream?.name) setTitle(stream.name);
    if (stream?.thumbnail_url) setPosterUrl(stream.thumbnail_url);

    const gateActive = stream
      ? isMeTokenGateActive(stream.requires_metoken, stream.metoken_price)
      : false;

    if (gateActive) {
      setError(
        "This live stream requires access from your phone. Open Creative TV on your mobile device to watch.",
      );
      setSources(null);
      setLoading(false);
      return;
    }

    if (!playbackSources?.length) {
      setError("This stream is offline or still starting. Check back soon.");
      setSources(null);
      setLoading(false);
      return;
    }

    // Public / non-gated streams: attempt JWT only when the API offers one without wallet.
    try {
      const jwtRes = await fetch("/api/internal/sign-jwt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbackId }),
      });
      if (jwtRes.ok) {
        const data = await jwtRes.json();
        if (data.token) setJwt(data.token);
      }
    } catch {
      // Watch-first: continue without JWT for open playback
    }

    setSources(playbackSources);
    setLoading(false);
  }, [playbackId]);

  useEffect(() => {
    void loadPlayback();
  }, [loadPlayback]);

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
          <button
            type="button"
            className="tv-cast-button tv-focusable mt-6"
            onClick={() => void loadPlayback()}
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <h1 className="mb-6">{title}</h1>
          <TVPlayerShell
            sources={sources}
            title={title}
            posterUrl={posterUrl}
            playbackId={playbackId}
            jwt={jwt}
            isLive
            surface="tv-live"
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
