import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/sdk/supabase/server';
import { serverLogger } from '@/lib/utils/logger';

// GET /api/video-assets/[id]/contribution - Get video contribution to MeToken
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);
    
    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get video asset to find creator_metoken_id
    const { data: videoAsset, error: videoError } = await supabase
      .from('video_assets')
      .select('id, creator_metoken_id, playback_id')
      .eq('id', videoId)
      .single();

    if (videoError || !videoAsset) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (!videoAsset.creator_metoken_id) {
      return NextResponse.json({
        data: {
          video_id: videoId,
          playback_id: videoAsset.playback_id,
          contribution: 0,
          transaction_count: 0,
        },
      });
    }

    // Calculate total contribution from transactions linked to this video
    const { data: transactions, error: txError } = await supabase
      .from('metoken_transactions')
      .select('collateral_amount, amount')
      .eq('metoken_id', videoAsset.creator_metoken_id)
      .eq('transaction_type', 'mint')
      .or(`video_id.eq.${videoId},playback_id.eq.${videoAsset.playback_id}`);

    if (txError) {
      serverLogger.error('Error fetching transactions:', txError);
      return NextResponse.json(
        { error: 'Failed to fetch contribution data' },
        { status: 500 }
      );
    }

    // Calculate total contribution (sum of collateral_amount for mint transactions)
    const contribution = transactions?.reduce((sum, tx) => {
      return sum + (parseFloat(tx.collateral_amount?.toString() || tx.amount?.toString() || '0'));
    }, 0) || 0;

    return NextResponse.json({
      data: {
        video_id: videoId,
        playback_id: videoAsset.playback_id,
        contribution,
        transaction_count: transactions?.length || 0,
      },
    });
  } catch (error) {
    serverLogger.error('Error calculating video contribution:', error);
    
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
        error: 'Failed to calculate contribution',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
