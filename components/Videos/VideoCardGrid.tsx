"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Asset } from "livepeer/models/components";
import { fetchAllAssets } from "@/app/api/livepeer/actions";
import VideoCard from "@/components/Videos/VideoCard";
import { Src } from "@livepeer/react";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { VideoCardSkeleton } from "./VideoCardSkeleton";
import { Pagination } from "@/components/ui/pagination";
import { fetchVideoAssetByPlaybackId } from "@/lib/utils/video-assets-client";

const ITEMS_PER_PAGE = 12; // Number of videos per page

const VideoCardGrid: React.FC = () => {
  const [playbackSources, setPlaybackSources] = useState<
    (Asset & { detailedSrc: Src[] | null })[] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [totalPublishedAssets, setTotalPublishedAssets] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  const fetchSources = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate offset based on current page
      const offset = (page - 1) * ITEMS_PER_PAGE;

      // Function to fetch assets with retries
      const fetchAssetsWithRetry = async (
        retries = 3
      ): Promise<{ data: Asset[]; total: number }> => {
        try {
          const response = await fetchAllAssets({
            limit: ITEMS_PER_PAGE,
            offset,
          });
          if (!response || !Array.isArray(response.data)) {
            throw new Error("Invalid response format");
          }
          return response;
        } catch (err) {
          if (retries > 0) {
            console.warn(
              `Retrying asset fetch. Attempts remaining: ${retries - 1}`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return fetchAssetsWithRetry(retries - 1);
          }
          throw err;
        }
      };

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
            console.warn(
              `Retrying playback source fetch for ${playbackId}. Attempts remaining: ${
                retries - 1
              }`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return fetchPlaybackSourceWithRetry(playbackId, retries - 1);
          }
          console.error(
            `Failed to fetch playback source for ${playbackId} after all retries:`,
            err
          );
          return null;
        }
      };

      // Fetch assets with pagination
      const { data: assets, total } = await fetchAssetsWithRetry();
      
      // Update total assets state
      setTotalAssets(total);

      // Only process assets that are ready for playback AND published in database
      const readyAndPublishedAssets = await Promise.all(
        assets
          .filter((asset) => asset.status?.phase === "ready" && asset.playbackId)
          .map(async (asset) => {
            // Check database status
            try {
              const dbAsset = await fetchVideoAssetByPlaybackId(asset.playbackId!);
              return dbAsset?.status === "published" ? asset : null;
            } catch (error) {
              console.error(`Failed to fetch DB status for ${asset.playbackId}:`, error);
              return null;
            }
          })
      );

      // Filter out null values (non-published videos)
      const publishedAssets = readyAndPublishedAssets.filter(Boolean) as Asset[];
      
      // Update published assets count and pagination state
      setTotalPublishedAssets(publishedAssets.length);
      setHasNextPage((page * ITEMS_PER_PAGE) < total);

      // Fetch detailed playback sources for each published asset
      const detailedPlaybackSources = await Promise.all(
        publishedAssets.map(async (asset: Asset) => {
          const detailedSrc = await fetchPlaybackSourceWithRetry(
            asset.playbackId!
          );
          return { ...asset, detailedSrc };
        })
      );

      // Filter out assets with failed playback sources
      const validPlaybackSources = detailedPlaybackSources.filter(
        (source) => source.detailedSrc !== null
      );

      console.log(
        "[VideoCardGrid] Valid playback sources:",
        validPlaybackSources
      );

      if (validPlaybackSources.length === 0 && currentPage === 1) {
        setError("No valid videos available at the moment.");
        return;
      }

      setPlaybackSources(validPlaybackSources);
    } catch (err) {
      console.error("Error fetching playback sources:", err);
      setError("Failed to load videos. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

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
    // Show pagination if:
    // 1. We have more than one page worth of published assets, OR
    // 2. We're on a page > 1 (to allow navigation back)
    return totalPublishedAssets > ITEMS_PER_PAGE || currentPage > 1;
  }, [totalPublishedAssets, currentPage]);

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
            totalDisplayed={0}
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
            totalDisplayed={0}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {playbackSources.map((asset) => (
          <VideoCard
            key={asset.id}
            asset={asset}
            playbackSources={asset.detailedSrc}
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
          totalDisplayed={playbackSources.length}
        />
      )}
    </div>
  );
};

export default VideoCardGrid;
