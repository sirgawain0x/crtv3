import { NextRequest, NextResponse } from 'next/server';
import { fetchAllViews } from '@/app/api/livepeer/views';
import { createServiceClient } from '@/lib/sdk/supabase/service';
import {
  mergeViewCounts,
  resolveViewCountSource,
  sumLivepeerViewMetrics,
} from '@/lib/livepeer/view-count';
import { getStoredViewsCount } from '@/lib/livepeer/sync-view-count';
import { serverLogger } from '@/lib/utils/logger';
import {
  LIVEPEER_AUTH_FAILED,
  LIVEPEER_NOT_CONFIGURED,
} from '@/lib/sdk/livepeer/studioAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * Read-only endpoint: returns max(Livepeer views, database views_count).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playbackId: string }> },
) {
  try {
    const { playbackId } = await params;

    if (!playbackId) {
      return NextResponse.json(
        { error: 'Playback ID is required', code: 'PLAYBACK_ID_REQUIRED' },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const viewsResult = await fetchAllViews(playbackId);
    const livepeerAvailable = viewsResult.ok;
    const livepeerTotal = viewsResult.ok
      ? sumLivepeerViewMetrics(viewsResult.metrics)
      : 0;

    if (!viewsResult.ok && viewsResult.reason === 'not_configured') {
      return NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503, headers: noStoreHeaders },
      );
    }

    if (
      !viewsResult.ok &&
      viewsResult.reason === 'upstream_error' &&
      (viewsResult.status === 401 || viewsResult.status === 403)
    ) {
      return NextResponse.json(
        {
          error: 'Livepeer authentication failed',
          code: LIVEPEER_AUTH_FAILED,
        },
        { status: 502, headers: noStoreHeaders },
      );
    }

    const supabase = createServiceClient();
    const dbViewCount = await getStoredViewsCount(supabase, playbackId);
    const displayTotal = mergeViewCounts(dbViewCount, livepeerTotal);
    const source = resolveViewCountSource(livepeerTotal, dbViewCount);

    return NextResponse.json(
      {
        success: true,
        source,
        playbackId,
        viewCount: displayTotal,
        playtimeMins: viewsResult.ok ? viewsResult.metrics.playtimeMins : 0,
        legacyViewCount: 0,
        livepeerAvailable,
        ...(!livepeerAvailable
          ? { code: 'LIVEPEER_VIEWS_UNAVAILABLE' as const }
          : {}),
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    serverLogger.error('Error fetching view metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'VIEW_METRICS_ERROR' },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
