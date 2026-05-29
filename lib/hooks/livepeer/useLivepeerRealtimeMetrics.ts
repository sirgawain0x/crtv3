"use client";

import { skipToken, useQuery } from "@tanstack/react-query";

export interface LivepeerRealtimeMetrics {
  playbackId: string;
  viewerCount: number;
}

interface UseLivepeerRealtimeMetricsOptions {
  refreshIntervalMs?: number;
}

const DEFAULT_REFRESH_INTERVAL_MS = 10_000; // Poll every 10 seconds for real-time concurrent views

export function livepeerRealtimeQueryKey(playbackId: string) {
  return ["livepeer-realtime-metrics", playbackId] as const;
}

export async function fetchLivepeerRealtimeMetrics(
  playbackId: string,
  signal?: AbortSignal,
): Promise<LivepeerRealtimeMetrics> {
  const response = await fetch(
    `/api/livepeer/views/realtime/${encodeURIComponent(playbackId)}?t=${Date.now()}`,
    {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal,
    },
  );

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch (err) {
    throw new Error("Failed to parse real-time metrics response");
  }

  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : "Failed to fetch real-time metrics";
    throw new Error(message);
  }

  if (!data.success) {
    throw new Error("Failed to fetch real-time metrics");
  }

  return {
    playbackId: String(data.playbackId ?? playbackId),
    viewerCount: Number(data.viewerCount ?? 0) || 0,
  };
}

/** Shared via React Query so duplicate playbackIds dedupe fetches and polling. */
export function useLivepeerRealtimeMetrics(
  playbackId: string,
  options: UseLivepeerRealtimeMetricsOptions = {},
) {
  const refreshIntervalMs =
    options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;

  const id = playbackId?.trim() ?? "";
  const enabled = id.length > 0;

  const query = useQuery({
    queryKey: livepeerRealtimeQueryKey(enabled ? id : "__skipped__"),
    queryFn: enabled
      ? ({ signal }) => fetchLivepeerRealtimeMetrics(id, signal)
      : skipToken,
    staleTime: 0,
    refetchInterval:
      enabled && refreshIntervalMs > 0 ? refreshIntervalMs : false,
  });

  const realtimeMetrics = query.data ?? null;
  const viewerCount = realtimeMetrics?.viewerCount ?? 0;

  const errorMsg =
    query.error instanceof Error
      ? query.error.message
      : query.error != null
        ? String(query.error)
        : null;

  return {
    realtimeMetrics,
    viewerCount,
    loading: enabled ? query.isPending : false,
    error: errorMsg,
  };
}
