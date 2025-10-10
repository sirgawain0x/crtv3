"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getThumbnailUrl } from '@/lib/utils/thumbnail';
import { fetchVideoAssetByPlaybackId } from '@/lib/utils/video-assets-client';
import { Player } from '@/components/Player/Player';
import { PlayIcon } from 'lucide-react';
import { Src } from '@livepeer/react';

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
          setThumbnailUrl((dbAsset as any).thumbnail_url);
          setIsLoading(false);
          return;
        }
        
        // If no database thumbnail, try Livepeer VTT thumbnails
        console.log('No database thumbnail found, trying Livepeer VTT for:', playbackId);
        const url = await getThumbnailUrl(playbackId);
        setThumbnailUrl(url);
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

  // If we should show the player or no thumbnail is available, show the player
  if (showPlayer || !thumbnailUrl || isLoading) {
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
      <Image
        src={thumbnailUrl}
        alt={title}
        fill
        className="object-cover rounded-lg"
        loading="lazy"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-200">
        <div className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-90 rounded-full group-hover:bg-opacity-100 transition-all duration-200">
          <PlayIcon className="w-8 h-8 text-black ml-1" />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default VideoThumbnail;
