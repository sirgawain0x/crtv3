"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getThumbnailUrl } from '@/lib/utils/thumbnail';
import { fetchVideoAssetByPlaybackId } from '@/lib/utils/video-assets-client';
import { Player } from '@/components/Player/Player';
import { PlayIcon, Volume2, VolumeX } from 'lucide-react';
import { Src } from '@livepeer/react';
import { convertFailingGateway, isIpfsUrl } from '@/lib/utils/image-gateway';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoThumbnailProps {
  playbackId: string;
  src: Src[] | null;
  title: string;
  assetId?: string;
  onPlay?: () => void;
  className?: string;
  enablePreview?: boolean;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  playbackId,
  src,
  title,
  assetId,
  onPlay,
  className = "",
  enablePreview = false
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted as requested
  const showPlayerRef = React.useRef(showPlayer);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function fetchThumbnail() {
      if (!playbackId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // First, try to get thumbnail from database
        const dbAsset = await fetchVideoAssetByPlaybackId(playbackId);
        if (dbAsset && (dbAsset as any).thumbnail_url) {
          console.log('Found database thumbnail:', (dbAsset as any).thumbnail_url);
          // Convert failing gateways to alternative gateways
          const convertedUrl = convertFailingGateway((dbAsset as any).thumbnail_url);
          setThumbnailUrl(convertedUrl);
          setIsLoading(false);
          return;
        }

        // If no database thumbnail, try Livepeer VTT thumbnails
        console.log('No database thumbnail found, trying Livepeer VTT for:', playbackId);
        const url = await getThumbnailUrl(playbackId);
        // Convert failing gateways to alternative gateways
        const convertedUrl = url ? convertFailingGateway(url) : null;
        setThumbnailUrl(convertedUrl);
      } catch (error) {
        console.error('Error fetching thumbnail:', error);
        setThumbnailUrl(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchThumbnail();
  }, [playbackId]);

  // Reset showPlayer when playbackId changes or component unmounts
  useEffect(() => {
    setShowPlayer(false);
    showPlayerRef.current = false;
    setIsPreviewing(false);

    return () => {
      setShowPlayer(false);
      showPlayerRef.current = false;
      setIsPreviewing(false);
    };
  }, [playbackId]);

  // Keep ref in sync with state
  useEffect(() => {
    showPlayerRef.current = showPlayer;
  }, [showPlayer]);

  // Preview Loop Logic (30s)
  useEffect(() => {
    if (isPreviewing && previewVideoRef.current) {
      const vid = previewVideoRef.current;

      const handleTimeUpdate = () => {
        if (vid.currentTime >= 30) {
          vid.currentTime = 0;
          vid.play().catch(e => console.error("Error looping preview:", e));
        }
      };

      vid.addEventListener('timeupdate', handleTimeUpdate);

      // Attempt to play unmuted
      vid.play().catch(err => {
        console.warn("Autoplay unmuted failed, trying muted", err);
        vid.muted = true;
        setIsMuted(true);
        vid.play().catch(e => console.error("Autoplay muted failed too", e));
      });

      return () => {
        vid.removeEventListener('timeupdate', handleTimeUpdate);
        vid.pause();
      };
    }
  }, [isPreviewing]);

  // Intersection Observer to reset states when out of view
  const setupObserver = React.useCallback((element: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            if (showPlayerRef.current) {
              setShowPlayer(false);
              showPlayerRef.current = false;
            }
            setIsPreviewing(false);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const containerCallbackRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      setupObserver(element);
    },
    [setupObserver]
  );

  const handleThumbnailClick = (e: React.MouseEvent) => {
    if (enablePreview) {
      // If preview is enabled, we don't want to expand the player inline.
      // The parent Link component will handle navigation.
      // We might want to stop propagation if there was logic here, but for now we just let it bubble.
      return;
    }
    setShowPlayer(true);
    onPlay?.();
  };

  const handleMouseEnter = () => {
    if (enablePreview && !showPlayer) {
      setIsPreviewing(true);
    }
  };

  const handleMouseLeave = () => {
    if (enablePreview && !showPlayer) {
      setIsPreviewing(false);
    }
  };

  // Find MP4 source for preview
  const mp4Source = src?.find(s => (s.type as string) === 'video/mp4' || (s.src as string).endsWith('.mp4'))?.src;

  // Show inline full player if clicked (and not in preview mode context usually, but kept for backward compat)
  if (showPlayer) {
    return (
      <div ref={containerCallbackRef} className={className}>
        <Player
          src={src}
          assetId={assetId}
          title={title}
          onPlay={onPlay}
        />
      </div>
    );
  }

  // Show skeleton while fetching thumbnail URL
  if (isLoading) {
    return (
      <div className={`relative aspect-video ${className}`}>
        <Skeleton className="w-full h-full rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerCallbackRef}
      className={`relative aspect-video w-full group ${enablePreview ? '' : 'cursor-pointer'} ${className}`}
      onClick={handleThumbnailClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Preview Player */}
      {isPreviewing && enablePreview && mp4Source ? (
        <div className="absolute inset-0 z-10 rounded-lg overflow-hidden bg-black">
          <video
            ref={previewVideoRef}
            src={mp4Source}
            className="w-full h-full object-cover"
            playsInline
            muted={isMuted} // Controlled by state
            loop={false} // Managed manually for 30s loop
          />
          <div className="absolute bottom-2 right-2 p-1 bg-black/50 rounded-full">
            {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </div>
        </div>
      ) : null}

      {/* Fallback to Image */}
      {(!isPreviewing || !mp4Source) && (
        <>
          {/* Skeleton loader while image loads */}
          {imageLoading && (
            <div className="absolute inset-0">
              <Skeleton className="w-full h-full rounded-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="h-16 w-16 rounded-full" />
              </div>
            </div>
          )}

          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className={`object-cover rounded-lg transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={thumbnailUrl ? isIpfsUrl(thumbnailUrl) : false}
              onLoadingComplete={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setThumbnailUrl(null);
              }}
            />
          ) : (
            // Fallback if no thumbnail URL and not previewing
            <Player
              src={src}
              assetId={assetId}
              title={title}
              onPlay={onPlay}
            />
          )}

          {/* Play button overlay - only show when image is loaded and NOT previewing */}
          {!imageLoading && thumbnailUrl && !isPreviewing && !enablePreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-200">
              <div className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-90 rounded-full group-hover:bg-opacity-100 transition-all duration-200">
                <PlayIcon className="w-8 h-8 text-black ml-1" />
              </div>
            </div>
          )}
          {/* If preview enabled, maybe show a different indicator or nothing on hover since it plays */}
          {!imageLoading && thumbnailUrl && !isPreviewing && enablePreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-all duration-200">
              {/* No play button for preview mode cards, or maybe a small one? User wants clicks to go to page. */}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VideoThumbnail;
