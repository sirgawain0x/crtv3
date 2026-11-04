"use client";

import VideoCard from "@/components/Videos/VideoCard";
import type { DiscoverVideoCard } from "@/components/Videos/VideoCardGrid";
import type { VideoAsset } from "@/lib/types/video-asset";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

function mapPublishedToCard(video: VideoAsset): DiscoverVideoCard {
  return {
    ...video,
    id: video.asset_id,
    playbackId: video.playback_id,
    name: video.title,
    status: {
      phase: "ready" as const,
    },
    creatorId: {
      value: video.creator_id,
    },
    createdAt: video.created_at,
    created_at: video.created_at,
    thumbnail_url:
      (video as { thumbnail_url?: string }).thumbnail_url ||
      video.thumbnailUri ||
      null,
    detailedSrc: null,
    videoAssetDbId: video.id,
    dbStatus: video.status,
    sourceType: video.source_type,
  };
}

type FairVideoGridProps = {
  videos: VideoAsset[];
  className?: string;
};

export function FairVideoGrid({ videos, className }: FairVideoGridProps) {
  if (videos.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center text-sm text-muted-foreground",
          className,
        )}
        aria-labelledby="fair-videos-empty-heading"
      >
        <Film className="mx-auto mb-3 h-9 w-9 opacity-50" aria-hidden />
        <p id="fair-videos-empty-heading" className="font-medium text-foreground">
          Videos coming soon
        </p>
        <p className="mt-2 max-w-md mx-auto">
          The FAIR lineup will appear here once videos are added to the static config.
        </p>
      </div>
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
      aria-label="FAIR video lineup"
    >
      {videos.map((video, index) => (
        <li key={video.id}>
          <VideoCard
            asset={mapPublishedToCard(video) as any}
            playbackSources={null}
            priority={index < 2}
          />
        </li>
      ))}
    </ul>
  );
}
