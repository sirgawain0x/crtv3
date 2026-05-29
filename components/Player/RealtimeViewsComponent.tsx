"use client";

import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLivepeerRealtimeMetrics } from "@/lib/hooks/livepeer/useLivepeerRealtimeMetrics";

interface RealtimeViewsComponentProps {
  playbackId: string;
}

export const RealtimeViewsComponent: React.FC<RealtimeViewsComponentProps> = ({
  playbackId,
}) => {
  const { viewerCount, loading, error } = useLivepeerRealtimeMetrics(playbackId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 backdrop-blur">
        <div className="h-2 w-2 rounded-full bg-gray-500 animate-pulse" />
        <Skeleton className="h-4 w-12 bg-slate-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-800/30 text-amber-400 text-xs font-semibold backdrop-blur"
        title={error}
      >
        <div className="h-2 w-2 rounded-full bg-amber-500" />
        <span>Live Metrics Off</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider backdrop-blur shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
      <span className="font-semibold text-white/90 font-mono">
        {viewerCount.toLocaleString()} watching
      </span>
    </div>
  );
};
