"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getThumbnailUrl } from '@/lib/utils/thumbnail';
import { fetchVideoAssetByPlaybackId } from '@/lib/utils/video-assets-client';
import { Player } from '@/components/Player/Player';
import { PlayIcon } from 'lucide-react';
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
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  playbackId,
  src,
  title,
  assetId,
  onPlay,
  className = ""
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

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

  const handleThumbnailClick = () => {
    setShowPlayer(true);
    onPlay?.();
  };

  // Show player if clicked
  if (showPlayer) {
    return (
      <Player
        src={src}
        assetId={assetId}
        title={title}
        onPlay={onPlay}
      />
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

  // If no thumbnail URL found, show player
  if (!thumbnailUrl) {
    return (
      <Player
        src={src}
        assetId={assetId}
        title={title}
        onPlay={onPlay}
      />
    );
  }

  // Show thumbnail with play button overlay
  return (
    <div 
      className={`relative aspect-video cursor-pointer group ${className}`}
      onClick={handleThumbnailClick}
    >
      {/* Skeleton loader while image loads */}
      {imageLoading && (
        <div className="absolute inset-0">
          <Skeleton className="w-full h-full rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
        </div>
      )}
      
      <Image
        src={thumbnailUrl}
        alt={title}
        fill
        className={`object-cover rounded-lg transition-opacity duration-300 ${
          imageLoading ? 'opacity-0' : 'opacity-100'
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
      
      {/* Play button overlay - only show when image is loaded */}
      {!imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-200">
          <div className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-90 rounded-full group-hover:bg-opacity-100 transition-all duration-200">
            <PlayIcon className="w-8 h-8 text-black ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoThumbnail;
