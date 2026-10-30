"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getActiveStreams, type ActiveStream } from "@/services/streams";
import { LivestreamThumbnail } from "@/components/Live/LivestreamThumbnail";

export function TVLiveRail() {
  const [streams, setStreams] = useState<ActiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getActiveStreams().then((active) => {
      if (!cancelled) {
        setStreams(active);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!streams.length) return null;

  return (
    <section aria-labelledby="tv-live-heading" className="mb-10">
      <h2 id="tv-live-heading" className="mb-4">Live Now</h2>
      <div className="tv-rail">
        {streams.map((stream) => (
          <Link
            key={stream.playback_id}
            href={`/tv/watch/${stream.playback_id}`}
            className="tv-rail-item tv-card tv-focusable overflow-hidden"
          >
            <div className="relative aspect-video bg-black/40">
              {stream.thumbnail_url ? (
                <LivestreamThumbnail thumbnailUrl={stream.thumbnail_url} />
              ) : (
                <div className="flex h-full items-center justify-center text-white/60">Live</div>
              )}
            </div>
            <div className="p-4">
              <p className="text-lg font-semibold line-clamp-2">{stream.name ?? "Live"}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
