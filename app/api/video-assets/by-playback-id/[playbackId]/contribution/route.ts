import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/sdk/supabase/server';

// GET /api/video-assets/by-playback-id/[playbackId]/contribution - Get video contribution by playback ID
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

    const supabase = await createClient();

    // Get video asset to find creator_metoken_id and video ID
    const { data: videoAsset, error: videoError } = await supabase
      .from('video_assets')
      .select('id, creator_metoken_id, playback_id')
      .eq('playback_id', playbackId)
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
          video_id: videoAsset.id,
          playback_id: playbackId,
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
      .or(`video_id.eq.${videoAsset.id},playback_id.eq.${playbackId}`);

    if (txError) {
      console.error('Error fetching transactions:', txError);
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
        video_id: videoAsset.id,
        playback_id: playbackId,
        contribution,
        transaction_count: transactions?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error calculating video contribution:', error);
    return NextResponse.json(
      { error: 'Failed to calculate contribution' },
      { status: 500 }
    );
  }
}
