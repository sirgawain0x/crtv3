'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPosts } from '@lens-protocol/client/actions';
import { evmAddress } from '@lens-protocol/types';
import type { AnyPost } from '@lens-protocol/graphql';
import { publicClient } from '@/lib/sdk/lens/client';
import { useLensOrbWrite } from '@/hooks/useLensOrbWrite';

type UseSongchainFeedOptions = {
  feedId: string | null;
  enabled?: boolean;
};

export function useSongchainFeed({ feedId, enabled = true }: UseSongchainFeedOptions) {
  const [posts, setPosts] = useState<AnyPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const lensWrite = useLensOrbWrite();

  const fetchPage = useCallback(
    async (mode: 'replace' | 'append') => {
      if (!feedId || !enabled) return;

      setLoading(true);
      setError(null);
      try {
        let client = publicClient;
        if (lensWrite.canWrite) {
          client = await lensWrite.getSessionClient();
        }

        const result = await fetchPosts(client, {
          filter: {
            feeds: [{ feed: evmAddress(feedId) }],
          },
          cursor: mode === 'append' ? (cursorRef.current ?? undefined) : undefined,
        });

        if (result.isErr()) {
          throw new Error(result.error.message);
        }

        const page = result.value;
        cursorRef.current = page.pageInfo.next ?? null;
        setHasMore(Boolean(page.pageInfo.next));
        setPosts((prev) =>
          mode === 'append' ? [...prev, ...page.items] : page.items,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      } finally {
        setLoading(false);
      }
    },
    [feedId, enabled, lensWrite],
  );

  useEffect(() => {
    if (!feedId || !enabled) {
      setPosts([]);
      cursorRef.current = null;
      setHasMore(false);
      return;
    }
    cursorRef.current = null;
    void fetchPage('replace');
  }, [feedId, enabled, lensWrite.canWrite, fetchPage]);

  const reload = useCallback(() => {
    cursorRef.current = null;
    return fetchPage('replace');
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return Promise.resolve();
    return fetchPage('append');
  }, [fetchPage, hasMore, loading]);

  return {
    posts,
    loading,
    error,
    hasMore,
    reload,
    loadMore,
  };
}
