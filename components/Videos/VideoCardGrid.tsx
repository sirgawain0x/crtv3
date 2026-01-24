"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Asset } from "livepeer/models/components";
import VideoCard from "@/components/Videos/VideoCard";
import { Src } from "@livepeer/react";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { VideoCardSkeleton } from "./VideoCardSkeleton";
import { Pagination } from "@/components/ui/pagination";
import { fetchPublishedVideos } from "@/lib/utils/published-videos-client";
import type { VideoAsset } from "@/lib/types/video-asset";
import { logger } from '@/lib/utils/logger';


const ITEMS_PER_PAGE = 12; // Number of videos per page

interface VideoCardGridProps {
  searchQuery?: string;
  category?: string;
  creatorId?: string;
  orderBy?: 'created_at' | 'views_count' | 'likes_count' | 'updated_at';
}

const VideoCardGrid: React.FC<VideoCardGridProps> = ({
  searchQuery,
  category,
  creatorId,
  orderBy = 'created_at'
}) => {
  const [playbackSources, setPlaybackSources] = useState<
    (Omit<VideoAsset, 'id' | 'status' | 'created_at'> & {
      detailedSrc: Src[] | null;
      id: string;
      playbackId: string;
      name: string;
      status: { phase: "ready" };
      creatorId: { value: string };
      createdAt: Date;
      created_at: Date;
    })[] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [validVideosCount, setValidVideosCount] = useState<number>(0);

  const fetchSources = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate offset based on current page
      const offset = (page - 1) * ITEMS_PER_PAGE;

      // Function to fetch playback source with retries
      const fetchPlaybackSourceWithRetry = async (
        playbackId: string,
        retries = 3
      ): Promise<Src[] | null> => {
        try {
          const detailedSrc = await getDetailPlaybackSource(playbackId);
          return detailedSrc;
        } catch (err) {
          if (retries > 0) {
            logger.warn(
              `Retrying playback source fetch for ${playbackId}. Attempts remaining: ${retries - 1
              }`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return fetchPlaybackSourceWithRetry(playbackId, retries - 1);
          }
          logger.error(
            `Failed to fetch playback source for ${playbackId} after all retries:`,
            err
          );
          return null;
        }
      };

      // 1. Fetch published videos from Supabase (single efficient query!)
      const { data: videos, total, hasMore } = await fetchPublishedVideos({
        limit: ITEMS_PER_PAGE,
        offset,
        orderBy,
        order: 'desc',
        creatorId,
        category,
        search: searchQuery,
      });


      // Update total (hasMore will be updated after filtering valid videos)
      setTotalAssets(total);

      if (videos.length === 0 && page === 1) {
        setError(searchQuery ? "No videos found matching your search." : "No videos available at the moment.");
        setPlaybackSources([]);
        return;
      }

      // 2. Fetch playback sources from Livepeer only for the videos we need
      const videosWithPlayback = await Promise.all(
        videos.map(async (video) => {
          const detailedSrc = await fetchPlaybackSourceWithRetry(video.playback_id);
          return {
            ...video,
            // Map to Asset-like structure for compatibility with VideoCard
            id: video.asset_id,
            playbackId: video.playback_id,
            name: video.title,
            // Add required Asset fields for VideoCard compatibility
            status: {
              phase: "ready" as const,
            },
            creatorId: {
              value: video.creator_id,
            },
            createdAt: video.created_at,
            detailedSrc,
          };
        })
      );

      // Filter out videos with failed playback sources
      const validPlaybackSources = videosWithPlayback.filter(
        (video) => video.detailedSrc !== null
      );

      // Update the count of valid videos that actually rendered
      setValidVideosCount(validPlaybackSources.length);

      // Update hasMore based on actual valid videos returned
      // If we got fewer videos than requested, we've reached the end
      // Also check if API says there are no more pages
      const actualHasMore = hasMore && validPlaybackSources.length >= ITEMS_PER_PAGE;
      setHasNextPage(actualHasMore);

      if (validPlaybackSources.length === 0 && page === 1) {
        setError("Unable to load video playback. Please try again later.");
        setPlaybackSources([]);
        setValidVideosCount(0);
        return;
      }

      setPlaybackSources(validPlaybackSources);
    } catch (err) {
      logger.error("Error fetching videos:", err);
      setError("Failed to load videos. Please try again later.");
      setValidVideosCount(0);
      setPlaybackSources([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, category, creatorId, orderBy]);

  // Reset to page 1 when search/filter parameters change
  useEffect(() => {
    setCurrentPage(1);
    setValidVideosCount(0);
  }, [searchQuery, category, creatorId, orderBy]);

  useEffect(() => {
    fetchSources(currentPage);
  }, [currentPage, fetchSources]);

  const handleNextPage = useCallback(() => {
    if (!hasNextPage || loading) return;

    setCurrentPage((prev) => prev + 1);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [hasNextPage, loading]);

  const handlePrevPage = useCallback(() => {
    if (currentPage === 1 || loading) return;

    setCurrentPage((prev) => prev - 1);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, loading]);

  // Helper function to determine if pagination should be shown
  const shouldShowPagination = useCallback(() => {
    // Show pagination only when:
    // 1. We have more than one page worth of assets (totalAssets > ITEMS_PER_PAGE), OR
    // 2. We're on a page > 1 (to allow navigation back), OR
    // 3. There's a next page available (hasNextPage)
    // This prevents showing pagination when there's only one page of results
    return totalAssets > ITEMS_PER_PAGE || currentPage > 1 || hasNextPage;
  }, [totalAssets, currentPage, hasNextPage]);

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-1 sm:gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
            <VideoCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>

        {/* Show pagination controls if appropriate */}
        {shouldShowPagination() && (
          <Pagination
            hasNextPage={hasNextPage}
            hasPrevPage={currentPage > 1}
            currentPage={currentPage}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            isLoading={loading}
            totalDisplayed={validVideosCount}
            totalVideos={totalAssets}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>
    );
  }

  if (!playbackSources || playbackSources.length === 0) {
    return (
      <div>
        <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-gray-50 p-4">
          <p>No videos available at the moment. Please check back later.</p>
        </div>

        {/* Show pagination controls if appropriate */}
        {shouldShowPagination() && (
          <Pagination
            hasNextPage={hasNextPage}
            hasPrevPage={currentPage > 1}
            currentPage={currentPage}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            isLoading={loading}
            totalDisplayed={validVideosCount}
            totalVideos={totalAssets}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-1 sm:gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {playbackSources.map((video, index) => (
          <VideoCard
            key={video.id}
            asset={video as any} // Type assertion needed due to Asset interface mismatch
            playbackSources={video.detailedSrc}
            priority={index === 0} // First video gets priority for LCP optimization
          />
        ))}
      </div>

      {shouldShowPagination() && (
        <Pagination
          hasNextPage={hasNextPage}
          hasPrevPage={currentPage > 1}
          currentPage={currentPage}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          isLoading={loading}
          totalDisplayed={validVideosCount}
          totalVideos={totalAssets}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}
    </div>
  );
};

export default VideoCardGrid;
