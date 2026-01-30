import { NextRequest, NextResponse } from 'next/server';
import { fullLivepeer } from '@/lib/sdk/livepeer/fullClient';
import { serverLogger } from '@/lib/utils/logger';

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
    const response = await fullLivepeer.playback.get(playbackId);

    // Check if the response contains errors
    if (response.error) {
      // Extract error message from Livepeer API response if available
      // The error object might differ based on the SDK version, assuming it matches ErrorT
      return NextResponse.json(
        {
          error: 'Playback info not found',
          details: response.error
        },
        { status: 404 }
      );
    }

    if (!response.playbackInfo) {
      return NextResponse.json(
        { error: 'Playback info not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(response.playbackInfo);
  } catch (error: any) {
    serverLogger.error('Error fetching playback info:', error);

    // Extract error message from Livepeer API response if available
    let errorMessage = 'Failed to fetch playback info';
    if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
