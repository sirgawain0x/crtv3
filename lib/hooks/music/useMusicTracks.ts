'use client';

import { useQuery } from '@tanstack/react-query';
import { musicIndexerSubgraph } from '@/lib/sdk/music-indexer';

export function useMusicTracks(limit = 50, skip = 0) {
  return useQuery({
    queryKey: ['music-tracks', limit, skip],
    queryFn: () => musicIndexerSubgraph.getLatestTracks(limit, skip),
    staleTime: 60 * 1000,
  });
}

export function useMusicTracksByPlatform(platform: string, limit = 50, skip = 0) {
  return useQuery({
    queryKey: ['music-tracks-platform', platform, limit, skip],
    queryFn: () => musicIndexerSubgraph.getTracksByPlatform(platform, limit, skip),
    enabled: !!platform,
    staleTime: 60 * 1000,
  });
}

export function useMusicTracksByChain(chain: string, limit = 50, skip = 0) {
  return useQuery({
    queryKey: ['music-tracks-chain', chain, limit, skip],
    queryFn: () => musicIndexerSubgraph.getTracksByChain(chain, limit, skip),
    enabled: !!chain,
    staleTime: 60 * 1000,
  });
}
