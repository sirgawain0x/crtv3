"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchPublishedVideos } from "@/lib/utils/published-videos-client";
import type { VideoAsset } from "@/lib/types/video-asset";

export function TVVideoGrid() {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchPublishedVideos({ limit: 24, orderBy: "views_count" }).then((result) => {
      if (!cancelled) {
        setVideos(result.data ?? []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-xl text-white/70">Loading videos…</p>;
  }

  if (!videos.length) {
    return <p className="text-xl text-white/70">No videos available right now.</p>;
  }

  return (
    <section aria-labelledby="tv-trending-heading">
      <h2 id="tv-trending-heading" className="mb-4">Trending</h2>
      <div className="tv-grid">
        {videos.map((video) => {
          const thumb =
            video.thumbnailUri || "/images/Creative_TV_Logo.png";
          return (
            <Link
              key={video.asset_id}
              href={`/tv/discover/${video.asset_id}`}
              className="tv-card tv-focusable overflow-hidden"
            >
              <div className="relative aspect-video bg-black/40">
                <Image
                  src={thumb}
                  alt={video.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1200px) 50vw, 25vw"
                />
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-lg font-semibold">{video.title}</h3>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
