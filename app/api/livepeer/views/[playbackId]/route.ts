import { NextRequest, NextResponse } from 'next/server';
import { fetchAllViews } from '@/app/api/livepeer/views';

/**
 * Read-only endpoint to fetch view metrics from Livepeer
 * This does NOT update the database - use /api/video-assets/sync-views for that
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
        { status: 400 }
      );
    }

    // Fetch metrics from Livepeer API
    const metrics = await fetchAllViews(playbackId);
    
    if (!metrics) {
      return NextResponse.json(
        { error: 'Failed to fetch view metrics from Livepeer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...metrics
    });

  } catch (error) {
    console.error('Error fetching view metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

