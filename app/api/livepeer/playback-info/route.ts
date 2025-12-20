import { NextRequest, NextResponse } from 'next/server';
import { fullLivepeer } from '@/lib/sdk/livepeer/fullClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playbackId = searchParams.get('playbackId');

    if (!playbackId) {
      return NextResponse.json(
        { error: 'Playback ID is required' },
        { status: 400 }
      );
    }

    // Validate that playbackId is not an Ethereum address
    // Ethereum addresses start with 0x and are 42 characters long
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (ethereumAddressRegex.test(playbackId)) {
      return NextResponse.json(
        { error: 'Invalid playback ID format. Expected Livepeer playback ID, received Ethereum address.' },
        { status: 400 }
      );
    }

    // Fetch playback info from Livepeer
    const playbackInfo = await fullLivepeer.playback.get(playbackId);
    
    // Check if the response contains errors (Livepeer API format)
    if (playbackInfo && 'errors' in playbackInfo && Array.isArray(playbackInfo.errors) && playbackInfo.errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Playback info not found',
          details: playbackInfo.errors 
        },
        { status: 404 }
      );
    }
    
    if (!playbackInfo) {
      return NextResponse.json(
        { error: 'Playback info not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(playbackInfo);
  } catch (error: any) {
    console.error('Error fetching playback info:', error);
    
    // Extract error message from Livepeer API response if available
    let errorMessage = 'Failed to fetch playback info';
    if (error?.errors && Array.isArray(error.errors)) {
      errorMessage = error.errors.join(', ');
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error?.errors || undefined
      },
      { status: 500 }
    );
  }
}
