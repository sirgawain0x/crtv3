import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/sdk/supabase/server';
import { fetchAllViews } from '@/app/api/livepeer/views';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playbackId: string }> }
) {
  try {
    const { playbackId } = await params;
    
    // Safely parse JSON body, falling back to empty object on empty/invalid body
    let body: any = {};
    try {
      body = await request.json();
    } catch (jsonError) {
      // Empty or invalid JSON body - use empty object
      body = {};
    }
    
    const { viewCount } = body || {};

    if (!playbackId) {
      return NextResponse.json(
        { error: 'Playback ID is required' },
        { status: 400 }
      );
    }

    // If viewCount is provided in the request body, use it
    // Otherwise, fetch from Livepeer API
    let finalViewCount = viewCount;
    if (!finalViewCount) {
      const metrics = await fetchAllViews(playbackId);
      if (!metrics) {
        return NextResponse.json(
          { error: 'Failed to fetch view metrics from Livepeer' },
          { status: 500 }
        );
      }
      finalViewCount = metrics.viewCount + metrics.legacyViewCount;
    }

    // Update the database
    const supabase = await createClient();
    const { error } = await supabase
      .from('video_assets')
      .update({ views_count: finalViewCount })
      .eq('playback_id', playbackId);

    if (error) {
      console.error('Failed to update view count:', error);
      return NextResponse.json(
        { error: 'Failed to update view count in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playbackId,
      viewCount: finalViewCount
    });

  } catch (error) {
    console.error('Error syncing view count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for manual syncing
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

    // Fetch from Livepeer API
    const metrics = await fetchAllViews(playbackId);
    if (!metrics) {
      return NextResponse.json(
        { error: 'Failed to fetch view metrics from Livepeer' },
        { status: 500 }
      );
    }

    const totalViews = metrics.viewCount + metrics.legacyViewCount;

    // Update the database
    const supabase = await createClient();
    const { error } = await supabase
      .from('video_assets')
      .update({ views_count: totalViews })
      .eq('playback_id', playbackId);

    if (error) {
      console.error('Failed to update view count:', error);
      return NextResponse.json(
        { error: 'Failed to update view count in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playbackId,
      viewCount: totalViews
    });

  } catch (error) {
    console.error('Error syncing view count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
