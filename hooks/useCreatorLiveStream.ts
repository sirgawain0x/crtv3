'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@account-kit/react';
import useModularAccount from '@/lib/hooks/accountkit/useModularAccount';
import type { StreamSummary } from '@/lib/songchain/build-lens-livestream-metadata';

export function useCreatorLiveStream(pollMs = 30_000) {
  const user = useUser();
  const { account: modularAccount } = useModularAccount();
  const creatorId = modularAccount?.address || user?.address || null;

  const [stream, setStream] = useState<StreamSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!creatorId) {
      setStream(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/streams/creator/${encodeURIComponent(creatorId)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) {
        if (res.status === 404) {
          setStream(null);
          return;
        }
        throw new Error('Failed to load stream');
      }
      const data = (await res.json()) as StreamSummary;
      setStream(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stream');
      setStream(null);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    void reload();
    if (!creatorId) return;
    const id = setInterval(() => void reload(), pollMs);
    return () => clearInterval(id);
  }, [reload, creatorId, pollMs]);

  return {
    stream,
    isLive: !!stream?.is_live,
    loading,
    error,
    reload,
    creatorId,
  };
}
