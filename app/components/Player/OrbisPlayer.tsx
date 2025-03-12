'use client';

import { useEffect, useRef, useState } from 'react';
import * as Player from '@livepeer/react/player';
import {
  LoadingIcon,
  PlayIcon,
  PauseIcon,
  MuteIcon,
  UnmuteIcon,
  EnterFullscreenIcon,
  ExitFullscreenIcon,
} from '@livepeer/react/assets';
import { cn } from '@app/lib/utils';
import { getDetailPlaybackSource } from '@app/lib/utils/hooks/useDetailPlaybackSources';
import { Src } from '@livepeer/react';

interface OrbisPlayerProps {
  playerId: string;
  currentPlayingId: string | null;
  playbackId: string;
  className?: string;
}

export function OrbisPlayer({
  playerId,
  currentPlayingId,
  playbackId,
  className,
}: OrbisPlayerProps) {
  const [playbackSources, setPlaybackSources] = useState<Src[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching playback sources for ID:', playbackId);
        const sources = await getDetailPlaybackSource(playbackId);

        if (!sources) {
          setError('Failed to load video sources');
          return;
        }

        setPlaybackSources(sources);
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Failed to load video');
      } finally {
        setIsLoading(false);
      }
    }

    if (playbackId) {
      fetchData();
    }
  }, [playbackId]);

  if (isLoading) {
    return (
      <div className={cn('relative aspect-video bg-black', className)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingIcon className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !playbackSources) {
    return (
      <div className={cn('relative aspect-video bg-black', className)}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <p className="text-lg font-medium">Failed to load video</p>
          <p className="text-sm text-white/70">
            {error || 'No playback sources available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Player.Root src={playbackSources}>
      <Player.Container className={cn('relative aspect-video', className)}>
        <Player.Video
          title="Video"
          className="h-full w-full"
          playsInline
          controls
        />
        <Player.LoadingIndicator className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
          <LoadingIcon className="h-8 w-8 animate-spin text-white" />
        </Player.LoadingIndicator>
      </Player.Container>
    </Player.Root>
  );
}
