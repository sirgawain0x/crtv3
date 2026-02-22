'use client';

import { useState, useCallback } from 'react';
import { useMusicTracks } from '@/lib/hooks/music/useMusicTracks';
import { MusicTrackCard } from '@/components/music/MusicTrackCard';
import { MusicPlayer, type NowPlayingTrack } from '@/components/music/MusicPlayer';
import type { MusicTrack } from '@/lib/sdk/music-indexer';

const TRACKS_PER_PAGE = 24;

export default function MusicPage() {
  const [page, setPage] = useState(0);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingTrack | null>(null);
  const { data: tracks = [], isLoading, error } = useMusicTracks(TRACKS_PER_PAGE, page * TRACKS_PER_PAGE);

  const handlePlay = useCallback(
    (track: MusicTrack, resolved: { title: string | null; artist: string | null; imageUrl: string | null; audioUrl: string | null }) => {
      if (!resolved.audioUrl) return;
      setNowPlaying({
        id: track.id,
        title: resolved.title ?? track.title ?? null,
        artist: resolved.artist ?? track.artist ?? null,
        imageUrl: resolved.imageUrl,
        audioUrl: resolved.audioUrl,
        platform: track.platform,
      });
    },
    []
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-2">On-Chain Music</h1>
        <p className="text-muted-foreground mb-8">
          Music indexed from Catalog, Sound, Mint Songs, Royal, EulerBeat, and Zora. Stream via IPFS (Grove).
        </p>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6">
            <p className="font-medium">Could not load tracks</p>
            <p className="text-sm mt-1">{error.message}</p>
            <p className="text-sm mt-2">Ensure the music indexer subgraph is deployed to Goldsky (music-eth/1.0.0 or merged endpoint).</p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tracks.map((track) => (
                <MusicTrackCard key={track.id} track={track} isPlaying={nowPlaying?.id === track.id} onPlay={handlePlay} />
              ))}
            </div>
            {tracks.length >= TRACKS_PER_PAGE && (
              <div className="mt-8 flex justify-center">
                <button type="button" onClick={() => setPage((p) => p + 1)} className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">Load more</button>
              </div>
            )}
            {!isLoading && tracks.length === 0 && (
              <p className="text-muted-foreground text-center py-12">No tracks indexed yet. Deploy the subgraph to Goldsky to start indexing.</p>
            )}
          </>
        )}
      </div>

      {nowPlaying && (
        <div className="sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-4">
          <MusicPlayer track={nowPlaying} />
        </div>
      )}
    </div>
  );
}
