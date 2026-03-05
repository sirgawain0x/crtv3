'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import type { MusicTrack } from '@/lib/sdk/music-indexer';
import { resolveMusicMetadata } from '@/lib/utils/music-metadata';
import { musicIpfsToGroveGateway } from '@/lib/utils/music-ipfs-gateway';
import { cn } from '@/lib/utils';

export interface MusicTrackCardProps {
  track: MusicTrack;
  isPlaying?: boolean;
  onPlay?: (track: MusicTrack, resolved: { title: string | null; artist: string | null; imageUrl: string | null; audioUrl: string | null }) => void;
  className?: string;
}

export function MusicTrackCard({ track, isPlaying, onPlay, className }: MusicTrackCardProps) {
  const [resolved, setResolved] = useState<{ title: string | null; artist: string | null; imageUrl: string | null; audioUrl: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (track.metadataUri) {
      resolveMusicMetadata(track.metadataUri).then((r) => {
        if (!cancelled) { setResolved(r); setLoading(false); }
      });
    } else {
      setResolved({
        title: track.title ?? null,
        artist: track.artist ?? null,
        imageUrl: track.imageUrl ? (track.imageUrl.startsWith('ipfs') ? musicIpfsToGroveGateway(track.imageUrl) : track.imageUrl) : null,
        audioUrl: track.audioUrl ? (track.audioUrl.startsWith('ipfs') ? musicIpfsToGroveGateway(track.audioUrl) : track.audioUrl) : null,
      });
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [track.metadataUri, track.title, track.artist, track.imageUrl, track.audioUrl]);

  const title = resolved?.title ?? track.title ?? 'Untitled';
  const artist = resolved?.artist ?? track.artist ?? 'Unknown';
  const imageUrl = resolved?.imageUrl ?? (track.imageUrl?.startsWith('ipfs') ? musicIpfsToGroveGateway(track.imageUrl) : track.imageUrl) ?? null;
  const audioUrl = resolved?.audioUrl ?? (track.audioUrl?.startsWith('ipfs') ? musicIpfsToGroveGateway(track.audioUrl) : track.audioUrl) ?? null;

  const handleClick = () => { if (audioUrl && onPlay) onPlay(track, { title: resolved?.title ?? null, artist: resolved?.artist ?? null, imageUrl: resolved?.imageUrl ?? null, audioUrl }); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } };

  return (
    <Card
      className={cn('overflow-hidden transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer', isPlaying && 'ring-2 ring-primary', className)}
      tabIndex={0}
      role="button"
      aria-label={`Play ${title} by ${artist}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="aspect-square relative bg-muted">
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-muted-foreground"><Play className="h-12 w-12" /></div>}
        {isPlaying && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-sm font-medium text-white">Playing</span></div>}
      </div>
      <CardContent className="p-3">
        <p className="font-medium truncate" title={title}>{loading ? '…' : title}</p>
        <p className="text-sm text-muted-foreground truncate" title={artist}>{artist}</p>
      </CardContent>
      <CardFooter className="p-3 pt-0 flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-xs">{track.platform}</Badge>
        <Badge variant="outline" className="text-xs">{track.chain}</Badge>
      </CardFooter>
    </Card>
  );
}
