'use client';
import React, { useEffect, useState } from 'react';
import { Asset } from 'livepeer/models/components';
import { fetchAllAssets } from '@app/api/livepeer/actions';
import { Src } from '@livepeer/react';
import { getDetailPlaybackSource } from '@app/lib/utils/hooks/useDetailPlaybackSources';
import OrbisVideoCard from './OrbisVideoCard';
import { useOrbisVideos } from '@app/lib/utils/hooks/useOrbisVideos';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { VideoCardSkeleton } from '../VideoCardSkeleton';

const VideoCardGrid: React.FC = () => {
  const [playbackSources, setPlaybackSources] = useState<
    (Asset & { detailedSrc: Src[] | null })[] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { videos: orbisVideos, loading: orbisLoading } = useOrbisVideos();

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
            readyAssets.map(async (asset: Asset) => {
              try {
                const detailedSrc = await getDetailPlaybackSource(
                  `${asset.playbackId}`,
                );
                return { ...asset, detailedSrc }; // Add detailedSrc to the asset object
              } catch (err) {
                console.error(
                  `Error fetching playback source for asset ${asset.id}:`,
                  err,
                );
                return { ...asset, detailedSrc: null }; // Handle errors for individual assets
              }
            }),
          );
          setPlaybackSources(detailedPlaybackSources); // Set the modified assets with detailed sources
        } else {
          setPlaybackSources([]);
        }
      } catch (err) {
        console.error('Error fetching playback sources: ', err);
        setError('Failed to load videos.');
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  // Filter assets to only include those that have metadata in OrbisDB
  const filteredAssets = React.useMemo(() => {
    if (!playbackSources || !orbisVideos || orbisLoading) return null;

    // Create a map of assetIds from OrbisDB for quick lookup
    const orbisAssetIds = new Set(
      orbisVideos.map((video: AssetMetadata) => video.assetId),
    );

    // Filter and serialize Livepeer assets to only include those with metadata in OrbisDB
    return playbackSources
      .filter((asset) => asset.id && orbisAssetIds.has(asset.id))
      .map((asset) => ({
        ...JSON.parse(JSON.stringify(asset)), // Serialize the asset to remove any non-serializable data
        detailedSrc: asset.detailedSrc
          ? JSON.parse(JSON.stringify(asset.detailedSrc))
          : null,
      }));
  }, [playbackSources, orbisVideos, orbisLoading]);

  if (loading || orbisLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <VideoCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!filteredAssets || filteredAssets.length === 0) {
    return (
      <p>No videos available. Make sure videos have metadata in OrbisDB.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {filteredAssets.map((asset) => (
        <OrbisVideoCard
          key={asset.id}
          asset={asset}
          playbackSources={asset.detailedSrc}
        />
      ))}
    </div>
  );
};

export default VideoCardGrid;
