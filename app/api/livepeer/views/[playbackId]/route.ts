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
  { params }: { params: Promise<{ playbackId: string }> }
) {
  try {
    const { playbackId } = await params;

    if (!playbackId) {
      return NextResponse.json(
        { error: 'Playback ID is required' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const metrics = await fetchAllViews(playbackId);
    const livepeerTotal = metrics ? sumLivepeerViewMetrics(metrics) : 0;

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
        playtimeMins: metrics?.playtimeMins ?? 0,
        legacyViewCount: 0,
      },
      { headers: noStoreHeaders }
    );

  } catch (error) {
    serverLogger.error('Error fetching view metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
