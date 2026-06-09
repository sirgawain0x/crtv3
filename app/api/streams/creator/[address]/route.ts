import { NextRequest, NextResponse } from 'next/server';
import { getStreamByCreator } from '@/services/streams';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    if (!address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const stream = await getStreamByCreator(address);
    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    return NextResponse.json({
      playback_id: stream.playback_id,
      name: stream.name,
      thumbnail_url: stream.thumbnail_url,
      is_live: stream.is_live,
      last_live_at: stream.last_live_at,
      requires_metoken: stream.requires_metoken ?? false,
      metoken_price: stream.metoken_price ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch stream',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
