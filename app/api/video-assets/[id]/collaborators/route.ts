import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/sdk/supabase/service';
import { serverLogger } from '@/lib/utils/logger';

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
      serverLogger.error('Error fetching collaborators:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collaborators' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
    });
  } catch (error) {
    serverLogger.error('Error in collaborators route:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Check for database connection errors
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Database connection error',
            details: 'Unable to connect to the database. Please try again later.'
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

