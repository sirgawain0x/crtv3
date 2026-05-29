import { NextRequest, NextResponse } from 'next/server';
import {
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from '@/lib/sdk/livepeer/studioAuth';
import { serverLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

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

    const token = resolveLivepeerStudioAuthToken();
    if (!token) {
      serverLogger.warn('Livepeer real-time views skipped: set LIVEPEER_FULL_API_KEY or LIVEPEER_API_KEY');
      return NextResponse.json(
        { error: 'Livepeer is not configured', code: 'LIVEPEER_NOT_CONFIGURED' },
        { status: 503, headers: noStoreHeaders },
      );
    }

    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);

    const base = livepeerStudioApiBaseUrl();
    const url = `${base}/api/data/views/now?playbackId=${encodeURIComponent(playbackId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!response.ok) {
      serverLogger.warn(`Livepeer real-time views API ${response.status} for playbackId=${playbackId}`);
      return NextResponse.json(
        { error: 'Failed to fetch real-time viewership', code: 'UPSTREAM_ERROR' },
        { status: response.status, headers: noStoreHeaders },
      );
    }

    const data = await response.json();
    const stats = Array.isArray(data) ? data : [];
    
    // Sum viewCount from returned dimensions (should match our playbackId query filter)
    const viewerCount = stats.reduce((sum, item) => sum + Number(item?.viewCount || 0), 0);

    return NextResponse.json(
      {
        success: true,
        playbackId,
        viewerCount,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    serverLogger.error('Error fetching real-time viewership:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'REALTIME_VIEWS_ERROR' },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
