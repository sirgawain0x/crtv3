"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
// import { Stream } from "livepeer/models/components"; // Removing unused import
import { VideoCardSkeleton } from "../Videos/VideoCardSkeleton";
import { LivestreamThumbnail } from "./LivestreamThumbnail";
import { getThumbnailUrl } from "@/services/livepeer-thumbnails";
import { logger } from '@/lib/utils/logger';


import { getActiveStreams, ActiveStream } from "@/services/streams";
import { RefreshCcw } from "lucide-react";

// Removed fetchStreamsFromApi since we use getActiveStreams now

export default function LivestreamGrid() {
  const [streams, setStreams] = useState<ActiveStream[]>([]); // Use ActiveStream type
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // const [thumbnails, setThumbnails] = useState<Record<string, string>>({}); // valid thumbnails are now in stream obj

  const fetchStreams = async () => {
    try {
      const activeStreams = await getActiveStreams();

      // Sort: Live streams first (though query handles this), then by date
      const sortedStreams = activeStreams.sort((a, b) => {
        return new Date(b.last_live_at || b.created_at).getTime() - new Date(a.last_live_at || a.created_at).getTime();
      });

      setStreams(sortedStreams);

      // Thumbnails are now directly on the stream object
    } catch (error) {
      logger.error("Error fetching streams:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStreams();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-1 sm:gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <VideoCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {streams.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          No active livestreams at the moment
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-1 sm:gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {streams.map((stream, index) => (
            // Use playback_id for URL, id for key
            <Link key={stream.id} href={`/watch/${stream.playback_id}`}>
              <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800/40">
                  {stream.thumbnail_url ? (
                    <LivestreamThumbnail
                      thumbnailUrl={stream.thumbnail_url}
                      priority={index < 4}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        {/* Fallback pattern or icon could go here */}
                        <span className="text-xs">No Thumbnail</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                    LIVE
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="truncate font-semibold">{stream.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Started{" "}
                    {stream.last_live_at
                      ? new Date(stream.last_live_at).toLocaleDateString()
                      : stream.created_at
                        ? new Date(stream.created_at).toLocaleDateString()
                        : "Unknown date"}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
