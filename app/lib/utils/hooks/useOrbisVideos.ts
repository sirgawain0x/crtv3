import { useEffect, useState } from 'react';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { Asset } from 'livepeer/models/components';

export const useOrbisVideos = () => {
  const orbisContext = useOrbisContext();
  const [videos, setVideos] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!orbisContext) {
        setError('OrbisContext not initialized');
        setLoading(false);
        return;
      }

      try {
        // Get all video assets one by one
        // TODO: Replace this with a proper query method once available
        const assetIds: string[] = []; // This should be populated with known asset IDs
        const videoPromises = assetIds.map(id => orbisContext.getAssetMetadata(id));
        const videos = await Promise.all(videoPromises);
        
        setVideos(videos.filter(video => video !== null) as AssetMetadata[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch videos');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [orbisContext]);

  return { videos, loading, error };
};
