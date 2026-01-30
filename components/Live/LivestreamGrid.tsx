"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Stream } from "livepeer/models/components";
import { VideoCardSkeleton } from "../Videos/VideoCardSkeleton";
import { LivestreamThumbnail } from "./LivestreamThumbnail";
import { getThumbnailUrl } from "@/services/livepeer-thumbnails";
import { logger } from '@/lib/utils/logger';


async function fetchStreamsFromApi(): Promise<Stream[]> {
  const res = await fetch("/api/livepeer");
  if (!res.ok) throw new Error("Failed to fetch streams");
  return res.json();
}

export default function LivestreamGrid() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const fetchStreams = async () => {
    try {
      const result = await fetchStreamsFromApi();
      // Only include streams that are currently active
      const activeStreams = (result ?? []).filter(
        (stream) => stream.isActive === true
      );
      const mappedStreams =
        activeStreams.map((stream) => ({
          ...stream,
          name: stream.name || `Stream ${stream.id}`,
        })) ?? [];
      setStreams(mappedStreams);

      // Fetch thumbnails for new streams
      mappedStreams.forEach(async (stream) => {
        if (!stream.playbackId || !stream.id) return;
        const res = (await getThumbnailUrl({
          playbackId: stream.playbackId,
        })) as import("@/lib/types/actions").ActionResponse<{
          thumbnailUrl: string;
        }>;
        if (res.success && res.data?.thumbnailUrl) {
          setThumbnails((prev) => ({
            ...prev,
            [String(stream.id)]: res.data!.thumbnailUrl,
          }));
        }
      });
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${refreshing ? "animate-spin" : ""}`}
          >
            <path d="M3 12a9 9 0 1 1 2.5 5.2" />
            <path d="M21 12H3" />
            <path d="M21 3v9" />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {streams.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          No active livestreams at the moment
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-1 sm:gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {streams.map((stream) => (
            <Link key={stream.id} href={`/watch/${stream.playbackId}`}>
              <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800/40">
                  {thumbnails?.[String(stream.id)] ? (
                    <LivestreamThumbnail
                      thumbnailUrl={thumbnails[String(stream.id)]}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                      Loading thumbnail...
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
                    {stream.createdAt
                      ? new Date(stream.createdAt).toLocaleDateString()
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
