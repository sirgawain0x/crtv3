'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCreatorWalletAddress } from '@/lib/hooks/accountkit/useCreatorWalletAddress';
import type { StreamSummary } from '@/lib/songchain/build-lens-livestream-metadata';

export function useCreatorLiveStream(pollMs = 30_000) {
  const { creatorAddress, signerAddress } = useCreatorWalletAddress();

  const [stream, setStream] = useState<StreamSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!creatorAddress) {
      setStream(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (signerAddress) {
        params.set('legacyCreatorAddress', signerAddress);
      }
      const query = params.toString();
      const res = await fetch(
        `/api/streams/creator/${encodeURIComponent(creatorAddress)}${query ? `?${query}` : ''}`,
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
  }, [creatorAddress, signerAddress]);

  useEffect(() => {
    void reload();
    if (!creatorAddress) return;
    const id = setInterval(() => void reload(), pollMs);
    return () => clearInterval(id);
  }, [reload, creatorAddress, pollMs]);

  return {
    stream,
    isLive: !!stream?.is_live,
    loading,
    error,
    reload,
    creatorId: creatorAddress,
  };
}
