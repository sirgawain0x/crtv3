import { useEffect, useState } from 'react';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { db } from '@app/lib/sdk/orbisDB/client';

export const useOrbisVideos = () => {
  const orbisContext = useOrbisContext();
  const [videos, setVideos] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const { rows } = await db
          .select()
          .from(process.env.NEXT_PUBLIC_ORBIS_ASSET_METADATA_MODEL_ID as string)
          .context(
            process.env.NEXT_PUBLIC_ORBIS_CRTV_VIDEOS_CONTEXT_ID as string,
          )
          .run();

        setVideos(rows as AssetMetadata[]);
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
