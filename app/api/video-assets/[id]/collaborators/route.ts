import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/sdk/supabase/service';

// GET /api/video-assets/[id]/collaborators - Get collaborators for a video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const videoId = parseInt(id, 10);
    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('video_collaborators')
      .select('*')
      .eq('video_id', videoId);

    if (error) {
      console.error('Error fetching collaborators:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collaborators' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
    });
  } catch (error) {
    console.error('Error in collaborators route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

