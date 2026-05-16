"use client";

import { useEffect, useState } from "react";

export interface LivepeerViewMetrics {
  playbackId: string;
  viewCount: number;
  playtimeMins: number;
  legacyViewCount: number;
}

interface UseLivepeerViewMetricsOptions {
  refreshIntervalMs?: number;
}

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;

export function useLivepeerViewMetrics(
  playbackId: string,
  options: UseLivepeerViewMetricsOptions = {},
) {
  const refreshIntervalMs =
    options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
  const [viewMetrics, setViewMetrics] = useState<LivepeerViewMetrics | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playbackId) {
      setViewMetrics(null);
      setError(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let controller: AbortController | null = null;

    async function fetchViewMetrics(showLoading: boolean) {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/livepeer/views/${encodeURIComponent(playbackId)}?t=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
            signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          const message =
            typeof data?.error === "string"
              ? data.error
              : "Failed to fetch view metrics";
          throw new Error(message);
        }

        if (!data.success) {
          throw new Error("Failed to fetch view metrics");
        }

        if (isMounted) {
          setViewMetrics({
            playbackId: data.playbackId,
            viewCount: data.viewCount,
            playtimeMins: data.playtimeMins,
            legacyViewCount: data.legacyViewCount,
          });
        }
      } catch (err) {
        if (!isMounted || signal.aborted) return;
        setError((err as Error).message || "Failed to fetch view metrics");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchViewMetrics(true);

    const intervalId =
      refreshIntervalMs > 0
        ? window.setInterval(() => fetchViewMetrics(false), refreshIntervalMs)
        : undefined;

    return () => {
      isMounted = false;
      controller?.abort();
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [playbackId, refreshIntervalMs]);

  const totalViews =
    (viewMetrics?.viewCount ?? 0) + (viewMetrics?.legacyViewCount ?? 0);

  return {
    viewMetrics,
    totalViews,
    loading,
    error,
  };
}
