'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchPostBookmarks } from '@lens-protocol/client/actions';
import type { AnyPost } from '@lens-protocol/graphql';
import { useLensOrbWrite } from '@/hooks/useLensOrbWrite';
import { clearStaleOrbSessionIfNeeded } from '@/lib/sdk/orb/session-errors';

export function useSongchainBookmarks() {
  const [posts, setPosts] = useState<AnyPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canWrite, getSessionClient, promptWriteAccess } = useLensOrbWrite();

  const load = useCallback(async () => {
    if (!canWrite) {
      setPosts([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const client = await getSessionClient();
      const result = await fetchPostBookmarks(client);
      if (result.isErr()) throw new Error(result.error.message);
      setPosts([...result.value.items]);
    } catch (err) {
      if (clearStaleOrbSessionIfNeeded(err)) {
        setError('Session expired — link Orb again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
      }
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [canWrite, getSessionClient]);

  useEffect(() => {
    void load();
  }, [load]);

  return { posts, loading, error, reload: load, canWrite, promptWriteAccess };
}
