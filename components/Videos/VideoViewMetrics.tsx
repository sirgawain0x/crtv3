"use client";

import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLivepeerViewMetrics } from "@/lib/hooks/livepeer/useLivepeerViewMetrics";

interface VideoViewMetricsProps {
  playbackId: string;
  /** DB-synced views_count used when Livepeer temporarily returns 0 or errors. */
  fallbackViews?: number;
}

const VideoViewMetrics: React.FC<VideoViewMetricsProps> = ({
  playbackId,
  fallbackViews = 0,
}) => {
  const { totalViews, loading, error } = useLivepeerViewMetrics(playbackId);

  if (loading) return <Skeleton className="h-4 w-16" />;

  const fallback = Math.max(0, Number(fallbackViews) || 0);
  const livepeer = Math.max(0, Number(totalViews) || 0);
  const displayViews = Math.max(livepeer, fallback);

  // Hard failure with nothing to show — stay blank rather than flash "0 views"
  if (error && displayViews <= 0) return null;

  return (
    <h3 className="text-sm font-medium text-muted-foreground md:text-base">
      {`${displayViews.toLocaleString()} views`}
    </h3>
  );
};

export default VideoViewMetrics;
