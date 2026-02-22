'use client';

import { useRef, useEffect } from 'react';

export interface NowPlayingTrack {
  id: string;
  title: string | null;
  artist: string | null;
  imageUrl: string | null;
  audioUrl: string;
  platform?: string;
}

interface MusicPlayerProps {
  track: NowPlayingTrack | null;
  className?: string;
}

export function MusicPlayer({ track, className }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    el.src = track.audioUrl;
    el.load();
    el.play().catch(() => {});
  }, [track?.id, track?.audioUrl]);

  if (!track) return null;

  return (
    <div className={className} role="region" aria-label="Now playing">
      <div className="flex items-center gap-3">
        {track.imageUrl && <img src={track.imageUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{track.title ?? 'Untitled'}</p>
          <p className="text-sm text-muted-foreground truncate">{track.artist ?? 'Unknown'}</p>
        </div>
      </div>
      <audio ref={audioRef} controls className="w-full h-10 mt-2" preload="metadata" />
    </div>
  );
}
