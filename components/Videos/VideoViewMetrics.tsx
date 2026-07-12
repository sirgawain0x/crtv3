"use client";

import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLivepeerViewMetrics } from "@/lib/hooks/livepeer/useLivepeerViewMetrics";

interface VideoViewMetricsProps {
  playbackId: string;
}

const VideoViewMetrics: React.FC<VideoViewMetricsProps> = ({ playbackId }) => {
  const { totalViews, loading, error } = useLivepeerViewMetrics(playbackId);

  if (loading) return <Skeleton className="h-4 w-16" />;
  if (error || !totalViews || totalViews <= 0) return null;

  return (
    <h3 className="text-sm font-medium text-muted-foreground md:text-base">
      {`${totalViews.toLocaleString()} views`}
    </h3>
  );
};

export default VideoViewMetrics;
