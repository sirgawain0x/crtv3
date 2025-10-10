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

    // Fetch playback info from Livepeer
    const playbackInfo = await fullLivepeer.playback.get(playbackId);
    
    if (!playbackInfo) {
      return NextResponse.json(
        { error: 'Playback info not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(playbackInfo);
  } catch (error) {
    console.error('Error fetching playback info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playback info' },
      { status: 500 }
    );
  }
}
