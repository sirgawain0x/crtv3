import { serverLogger } from '@/lib/utils/logger';
import { getFullLivepeer } from '@/lib/sdk/livepeer/fullClient';
import {
  hasLivepeerErrors,
  parseLivepeerViewMetricsBody,
  type ParsedViewMetrics,
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

function isZeroMetrics(metrics: ParsedViewMetrics): boolean {
  return (
    metrics.viewCount === 0 &&
    metrics.legacyViewCount === 0 &&
    metrics.playtimeMins === 0
  );
}

function toLivepeerViewMetrics(parsed: ParsedViewMetrics): LivepeerViewMetrics {
  return {
    playbackId: parsed.playbackId,
    viewCount: parsed.viewCount,
    playtimeMins: parsed.playtimeMins,
    legacyViewCount: parsed.legacyViewCount,
  };
}

async function livepeerAuthedGet(
  path: string,
  token: string,
): Promise<
  | { ok: true; status: number; rawData: unknown }
  | { ok: false; status: number }
> {
  const myHeaders = new Headers();
  myHeaders.append('Authorization', `Bearer ${token}`);

  const base = livepeerStudioApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const rawData = await response.json();
  if (hasLivepeerErrors(rawData)) {
    return { ok: false, status: response.status };
  }

  return { ok: true, status: response.status, rawData };
}

async function fetchTotalViewsViaHttp(
  playbackId: string,
  token: string,
): Promise<FetchAllViewsResult> {
  const result = await livepeerAuthedGet(
    `/api/data/views/query/total/${encodeURIComponent(playbackId)}`,
    token,
  );

  if (!result.ok) {
    serverLogger.warn(
      `Livepeer total views API ${result.status} for playbackId=${playbackId}`,
    );
    return {
      ok: false,
      reason: 'upstream_error',
      status: result.status,
    };
  }

  const parsed = parseLivepeerViewMetricsBody(result.rawData, playbackId);
  if (!parsed) {
    return {
      ok: false,
      reason: 'upstream_error',
      status: result.status,
    };
  }

  return { ok: true, metrics: toLivepeerViewMetrics(parsed) };
}

/** Studio dashboard can show views before the /total endpoint reflects them. */
async function fetchViewershipQueryViaHttp(
  playbackId: string,
  token: string,
): Promise<FetchAllViewsResult> {
  const params = new URLSearchParams({
    playbackId,
    from: new Date(0).toISOString(),
    to: new Date().toISOString(),
  });

  const result = await livepeerAuthedGet(
    `/api/data/views/query?${params.toString()}`,
    token,
  );

  if (!result.ok) {
    serverLogger.warn(
      `Livepeer viewership query API ${result.status} for playbackId=${playbackId}`,
    );
    return {
      ok: false,
      reason: 'upstream_error',
      status: result.status,
    };
  }

  const parsed = parseLivepeerViewMetricsBody(result.rawData, playbackId);
  if (!parsed) {
    return {
      ok: false,
      reason: 'upstream_error',
      status: result.status,
    };
  }

  return { ok: true, metrics: toLivepeerViewMetrics(parsed) };
}

async function fetchAllViewsViaHttp(
  playbackId: string,
  token: string,
): Promise<FetchAllViewsResult> {
  const totalResult = await fetchTotalViewsViaHttp(playbackId, token);
  if (!totalResult.ok) {
    return totalResult;
  }

  if (!isZeroMetrics(totalResult.metrics)) {
    return totalResult;
  }

  const queryResult = await fetchViewershipQueryViaHttp(playbackId, token);
  if (queryResult.ok && !isZeroMetrics(queryResult.metrics)) {
    serverLogger.debug(
      `Livepeer viewership query fallback used for playbackId=${playbackId} (total=0, query=${queryResult.metrics.viewCount + queryResult.metrics.legacyViewCount})`,
    );
    return queryResult;
  }

  return totalResult;
}

async function fetchTotalViewsViaSdk(
  playbackId: string,
): Promise<FetchAllViewsResult | null> {
  const client = getFullLivepeer();
  if (!client) return null;

  try {
    const response = await client.metrics.getPublicViewership(playbackId);

    if (response.data) {
      const parsed = parseLivepeerViewMetricsBody(response.data, playbackId);
      if (parsed) {
        return { ok: true, metrics: toLivepeerViewMetrics(parsed) };
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

  return null;
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

  const sdkResult = await fetchTotalViewsViaSdk(playbackId);
  if (sdkResult?.ok && !isZeroMetrics(sdkResult.metrics)) {
    return sdkResult;
  }
  if (sdkResult && !sdkResult.ok) {
    return sdkResult;
  }

  try {
    return await fetchAllViewsViaHttp(playbackId, token);
  } catch (error) {
    serverLogger.error('Failed to fetch view metrics:', error);
    return { ok: false, reason: 'network_error' };
  }
};
