'use client';
import React, { useEffect, useState } from 'react';
import { Asset } from 'livepeer/models/components';
import { fetchAllAssets } from '@app/api/livepeer/actions';
import VideoCard from '@app/components/Videos/VideoCard';
import { Src } from '@livepeer/react';
import { getDetailPlaybackSource } from '@app/lib/utils/hooks/useDetailPlaybackSources';
import { useOrbisVideos } from '@app/lib/utils/hooks/useOrbisVideos';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';

type VideoCardProps = {
  asset: Asset;
  playbackSources: Src[] | null;
  metadata?: AssetMetadata;
};

const VideoCardGrid: React.FC = () => {
  const [playbackSources, setPlaybackSources] = useState<
    (Asset & { detailedSrc: Src[] | null; metadata?: AssetMetadata })[] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { videos: orbisVideos, loading: orbisLoading, error: orbisError } = useOrbisVideos();

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetchAllAssets();
        if (response && Array.isArray(response)) {
          // Only process assets that are ready for playback
          const readyAssets = response.filter(
            (asset) => asset.status?.phase === 'ready',
          );

          // Fetch detailed playback sources for each ready asset
          const detailedPlaybackSources = await Promise.all(
            readyAssets.map(async (asset) => {
              const detailedSrc = await getDetailPlaybackSource(asset.playbackId);
              // Find matching OrbisDB metadata
              const metadata = orbisVideos.find(v => v.assetId === asset.id);
              return {
                ...asset,
                detailedSrc,
                metadata
              };
            }),
          );

          setPlaybackSources(detailedPlaybackSources);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch assets');
      } finally {
        setLoading(false);
      }
    };

    if (!orbisLoading) {
      fetchSources();
    }
  }, [orbisLoading, orbisVideos]);

  if (loading || orbisLoading) {
    return <div className="text-center">Loading videos...</div>;
  }

  if (error || orbisError) {
    return (
      <div className="text-center text-red-500">
        Error: {error || orbisError}
      </div>
    );
  }

  if (!playbackSources || playbackSources.length === 0) {
    return (
      <div className="text-center">
        No videos available at the moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {playbackSources.map((source) => (
        <VideoCard
          key={source.id}
          asset={source}
          playbackSources={source.detailedSrc}
          metadata={source.metadata}
        />
      ))}
    </div>
  );
};

export default VideoCardGrid;
