import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { fetchPublishedVideos } from "@/lib/utils/published-videos-client";
import type { VideoAsset } from "@/lib/types/video-asset";
import { Src } from "@livepeer/react";
import { toast } from "sonner";
import Link from "next/link";
import { TrendingUpIcon } from "lucide-react";
import VideoThumbnail from "@/components/Videos/VideoThumbnail";
import { ViewsComponent } from "@/components/Player/ViewsComponent";
import { HERO_VIDEO_ASSET_ID } from "@/context/context";

export function TopVideos() {
  const [videos, setVideos] = React.useState<VideoAsset[]>([]);
  const [playbackSources, setPlaybackSources] = React.useState<
    Record<string, Src[] | null>
  >({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;

    const fetchTrendingVideos = async () => {
      if (!isMounted) return;
      
      abortController = new AbortController();
      const signal = abortController.signal;
      
      try {
        setLoading(true);
        setError(null);

        // Step 1: Fetch trending videos from database (ordered by views_count)
        // Fetch 11 videos to ensure we have 10 after excluding the hero video
        console.log("Fetching trending videos from database...");
        const { data: trendingVideos } = await fetchPublishedVideos({
          limit: 11, // Fetch 11 to ensure we have 10 after excluding hero video
          offset: 0,
          orderBy: 'views_count', // Order by views to get trending content
          order: 'desc',
        });

        if (!isMounted || signal.aborted) return;

        if (!trendingVideos || trendingVideos.length === 0) {
          console.warn("No trending videos found");
          setVideos([]);
          setPlaybackSources({});
          setLoading(false);
          return;
        }

        // Filter out the hero video from the trending list
        const filteredVideos = trendingVideos.filter(
          (video) => video.asset_id !== HERO_VIDEO_ASSET_ID
        ).slice(0, 10); // Take top 10 after filtering

        if (filteredVideos.length === 0) {
          console.warn("No trending videos found after filtering hero video");
          setVideos([]);
          setPlaybackSources({});
          setLoading(false);
          return;
        }

        console.log(`Found ${filteredVideos.length} trending videos (excluding hero video)`);

        // Step 2: Fetch playback sources for each video
        // Don't set videos state until playback sources are ready to avoid rendering videos without sources
        const sources: Record<string, Src[] | null> = {};
        console.log("Starting to fetch playback sources...");

        for (const video of filteredVideos) {
          if (!isMounted || signal.aborted) {
            // If aborted, don't set any state - component is unmounting
            return;
          }
          
          if (!video.playback_id) {
            console.warn(`Video ${video.asset_id} has no playback_id`);
            sources[video.asset_id] = null;
            continue;
          }

          try {
            console.log(
              `Fetching playback source for video ${video.playback_id}...`
            );

            // Get the playback source with abort signal support
            const src = await getDetailPlaybackSource(video.playback_id, { 
              signal 
            });
            
            if (!isMounted || signal.aborted) {
              // If aborted, don't set any state - component is unmounting
              return;
            }
            
            console.log(`Playback source for ${video.playback_id}:`, src);

            if (!src || src.length === 0) {
              console.error(
                `No valid source found for video ${video.playback_id}`
              );
              sources[video.asset_id] = null;
              continue;
            }

            sources[video.asset_id] = src;
          } catch (error) {
            if (!isMounted || signal.aborted) {
              // If aborted, don't set any state - component is unmounting
              return;
            }
            
            // Check if it's an abort error
            if (error instanceof Error && (
              error.name === 'AbortError' || 
              error.message.includes('aborted') ||
              error.message.includes('signal is aborted')
            )) {
              console.warn(`Video ${video.playback_id} fetch was aborted:`, error.message);
              // If aborted, don't set any state - component is unmounting
              return;
            }
            
            console.error(
              `Error fetching playback source for video ${video.playback_id}:`,
              error
            );
            sources[video.asset_id] = null;
          }
        }

        if (!isMounted || signal.aborted) {
          // If aborted, don't set any state - component is unmounting
          return;
        }
        
        // Only set both videos and playback sources together after all sources are fetched
        // This ensures videos are never rendered without their playback sources
        console.log("Final playback sources:", sources);
        setVideos(filteredVideos);
        setPlaybackSources(sources);
      } catch (error) {
        if (!isMounted || signal.aborted) return;
        
        // Check if it's an abort error
        if (error instanceof Error && (
          error.name === 'AbortError' || 
          error.message.includes('aborted') ||
          error.message.includes('signal is aborted')
        )) {
          console.warn('TopVideos fetch was aborted:', error.message);
          return; // Don't set error for abort signals
        }
        
        console.error("Error in fetchTrendingVideos:", error);
        setError("Failed to load trending videos");
        toast.error("Failed to load trending videos");
      } finally {
        if (isMounted && !signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTrendingVideos();

    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort("Component unmounted");
      }
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold">
            <span className="animate-pulse">
              <TrendingUpIcon className="inline-block h-10 w-10 text-green-700" />
            </span>
            TRENDING VIDEOS
          </h1>
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold">
            <span className="animate-pulse">
              <TrendingUpIcon className="inline-block h-10 w-10 text-green-700" />
            </span>
            TRENDING VIDEOS
          </h1>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={[
                "h-[300px] animate-pulse rounded-lg bg-gray-200",
                index > 0 ? "hidden sm:block" : "",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold">
            <span className="animate-pulse">
              <TrendingUpIcon className="inline-block h-10 w-10 text-green-700" />
            </span>{" "}
            TRENDING VIDEOS
          </h1>
          <p className="text-gray-500">No trending videos available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold">
          <span className="animate-pulse">
            <TrendingUpIcon className="inline-block h-10 w-10 text-green-700" />
          </span>{" "}
          TRENDING VIDEOS
        </h1>
      </div>
      <div className="relative mx-auto w-full max-w-7xl">
        <Carousel className="min-w-sm mx-auto w-full max-w-7xl">
          <CarouselContent className="-ml-1">
            {videos.map((video, index) => (
              <CarouselItem
                key={video.asset_id}
                className="basis-full pl-0 sm:basis-1/2 sm:pl-1 md:basis-1/2 lg:basis-1/3 xl:basis-1/3"
              >
                <div className="group h-full p-1">
                  <Card className="relative h-[300px] w-full overflow-hidden transition-transform duration-200 ease-in-out group-hover:scale-[1.02]">
                    <CardContent className="absolute inset-0 p-0">
                      {video.playback_id ? (
                        <VideoThumbnail
                          playbackId={video.playback_id}
                          src={playbackSources[video.asset_id]}
                          title={video.title}
                          assetId={video.asset_id}
                          className="!aspect-auto h-full w-full"
                          priority={index === 0} // First video gets priority for LCP optimization
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-900 text-white">
                          No playback ID available
                        </div>
                      )}
                      {/* Top bar with view counts */}
                      {video.playback_id && (
                        <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent pt-2">
                          <div className="flex items-center justify-end px-3 py-1">
                            <ViewsComponent playbackId={video.playback_id} />
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <Link
                          href={`/discover/${video.asset_id}`}
                          className="block hover:underline"
                        >
                          <h3 className="line-clamp-2 text-sm font-medium text-white">
                            {video.title}
                          </h3>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 transform text-[#EC407A] hover:text-[#EC407A]/80 h-12 w-12" />
          <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 transform text-[#EC407A] hover:text-[#EC407A]/80 h-12 w-12" />
        </Carousel>
      </div>
    </div>
  );
}
