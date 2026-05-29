import { serverLogger } from '@/lib/utils/logger';
import { getFullLivepeer } from '@/lib/sdk/livepeer/fullClient';
import {
  hasLivepeerErrors,
  parseLivepeerViewMetricsBody,
} from '@/lib/livepeer/parse-view-metrics';
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

function getSdkErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const status = Number(obj.statusCode ?? obj.status);
    if (Number.isFinite(status)) return status;
  }
  if (error instanceof Error) {
    const match = error.message.match(/Status (\d{3})/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

async function fetchAllViewsViaHttp(
  playbackId: string,
  token: string,
): Promise<FetchAllViewsResult> {
  const myHeaders = new Headers();
  myHeaders.append('Authorization', `Bearer ${token}`);

  const base = livepeerStudioApiBaseUrl();
  const response = await fetch(
    `${base}/api/data/views/query/total/${encodeURIComponent(playbackId)}`,
    {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
      cache: 'no-store',
    },
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

  if (hasLivepeerErrors(rawData)) {
    serverLogger.warn(
      `Livepeer views API returned errors for playbackId=${playbackId}`,
    );
    return {
      ok: false,
      reason: 'upstream_error',
      status: response.status,
    };
  }

  const parsed = parseLivepeerViewMetricsBody(rawData, playbackId);
  if (!parsed) {
    return {
      ok: false,
      reason: 'upstream_error',
      status: response.status,
    };
  }

  return { ok: true, metrics: parsed };
}

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

  const client = getFullLivepeer();

  if (client) {
    try {
      const response = await client.metrics.getPublicViewership(playbackId);

      if (response.data) {
        const parsed = parseLivepeerViewMetricsBody(response.data, playbackId);
        if (parsed) {
          return { ok: true, metrics: parsed };
        }
      }

      if (response.error) {
        serverLogger.warn(
          `Livepeer SDK view metrics error for playbackId=${playbackId}`,
        );
        return {
          ok: false,
          reason: 'upstream_error',
          status: response.statusCode,
        };
      }
    } catch (error) {
      const status = getSdkErrorStatus(error);
      serverLogger.warn(
        `Livepeer SDK view metrics failed for playbackId=${playbackId}: ${error instanceof Error ? error.message : error}`,
      );
      return {
        ok: false,
        reason: 'upstream_error',
        status,
      };
    }
  }

  try {
    return await fetchAllViewsViaHttp(playbackId, token);
  } catch (error) {
    serverLogger.error('Failed to fetch view metrics:', error);
    return { ok: false, reason: 'network_error' };
  }
};
