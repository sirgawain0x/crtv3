import { useEffect, useState } from 'react';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';

export const useOrbisVideos = () => {
  const orbisContext = useOrbisContext();
  const [videos, setVideos] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
  }, [orbisContext]);

  return { videos, loading, error };
};
