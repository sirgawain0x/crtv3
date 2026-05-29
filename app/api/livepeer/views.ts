import { serverLogger } from '@/lib/utils/logger';
import {
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from '@/lib/sdk/livepeer/studioAuth';

export {
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from '@/lib/sdk/livepeer/studioAuth';

export type LivepeerViewMetrics = {
  playbackId: string;
  viewCount: number;
  playtimeMins: number;
  legacyViewCount: number;
};

export type FetchAllViewsResult =
  | { ok: true; metrics: LivepeerViewMetrics }
  | {
      ok: false;
      reason: 'not_configured' | 'upstream_error' | 'network_error';
      status?: number;
    };

export const fetchAllViews = async (
  playbackId: string,
): Promise<FetchAllViewsResult> => {
  const token = resolveLivepeerStudioAuthToken();
  if (!token) {
    serverLogger.warn(
      'Livepeer view metrics skipped: set LIVEPEER_FULL_API_KEY or LIVEPEER_API_KEY',
    );
    return { ok: false, reason: 'not_configured' };
  }

  const myHeaders = new Headers();
  myHeaders.append('Authorization', `Bearer ${token}`);

  const requestOptions = {
    method: 'GET' as const,
    headers: myHeaders,
    redirect: 'follow' as const,
    cache: 'no-store' as const,
  };

  try {
    const base = livepeerStudioApiBaseUrl();
    const response = await fetch(
      `${base}/api/data/views/query/total/${encodeURIComponent(playbackId)}`,
      requestOptions,
    );

    if (!response.ok) {
      serverLogger.warn(
        `Livepeer views API ${response.status} for playbackId=${playbackId}`,
      );
      return {
        ok: false,
        reason: 'upstream_error',
        status: response.status,
      };
    }

    const rawData = await response.json();
    const metricsObj = Array.isArray(rawData) ? rawData[0] : rawData;
    const targetMetrics = metricsObj || {};

    return {
      ok: true,
      metrics: {
        playbackId: String(targetMetrics.playbackId ?? playbackId),
        viewCount: Number(targetMetrics.viewCount ?? 0) || 0,
        playtimeMins: Number(targetMetrics.playtimeMins ?? 0) || 0,
        legacyViewCount: Number(targetMetrics.legacyViewCount ?? 0) || 0,
      },
    };
  } catch (error) {
    serverLogger.error('Failed to fetch view metrics:', error);
    return { ok: false, reason: 'network_error' };
  }
};
