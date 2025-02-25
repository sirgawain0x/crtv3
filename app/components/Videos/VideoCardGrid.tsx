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
        
        if (!response || response.length === 0) {
          setPlaybackSources([]);
          return;
        }
        
        // Only process assets that are ready for playback
        const readyAssets = response.filter(
          (asset) => asset.status?.phase === 'ready',
        );

        if (readyAssets.length === 0) {
          setPlaybackSources([]);
          return;
        }

        // Fetch detailed playback sources for each ready asset
        const detailedPlaybackSourcesPromises = readyAssets.map(async (asset) => {
          try {
            // Check if playbackId exists before using it
            if (!asset.playbackId) {
              console.warn(`Asset ${asset.id} is missing playbackId`);
              return {
                ...asset,
                detailedSrc: null,
                metadata: orbisVideos.find(v => v.assetId === asset.id)
              };
            }
            
            const detailedSrc = await getDetailPlaybackSource(asset.playbackId);
            // Find matching OrbisDB metadata
            const metadata = orbisVideos.find(v => v.assetId === asset.id);
            return {
              ...asset,
              detailedSrc,
              metadata
            };
          } catch (srcError) {
            console.error(`Error fetching playback source for ${asset.id}:`, srcError);
            return {
              ...asset,
              detailedSrc: null,
              metadata: orbisVideos.find(v => v.assetId === asset.id)
            };
          }
        });

        const detailedPlaybackSources = await Promise.all(detailedPlaybackSourcesPromises);
        setPlaybackSources(detailedPlaybackSources);
      } catch (err) {
        console.error('Error fetching video data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch assets');
        setPlaybackSources([]);
      } finally {
        setLoading(false);
      }
    };

    // Don't wait for OrbisVideos to load since we modified that hook to be simpler
    fetchSources();
  }, [orbisVideos]);

  if (loading) {
    return <div className="text-center py-8">Loading videos...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading videos: {error}
      </div>
    );
  }

  if (!playbackSources || playbackSources.length === 0) {
    return (
      <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-lg text-gray-600">No videos available at the moment.</p>
        <p className="mt-2 text-gray-500">Videos will appear here once they are uploaded and processed.</p>
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
