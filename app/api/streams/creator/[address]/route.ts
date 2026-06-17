import { NextRequest, NextResponse } from 'next/server';
import { resolveStreamForCreator } from '@/services/streams';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    if (!address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const legacyCreatorAddress =
      request.nextUrl.searchParams.get('legacyCreatorAddress')?.trim() || undefined;

    const stream = await resolveStreamForCreator(
      address.toLowerCase(),
      legacyCreatorAddress?.toLowerCase(),
    );
    if (!stream) {
      return NextResponse.json({
        playback_id: null,
        name: null,
        thumbnail_url: null,
        is_live: false,
        last_live_at: null,
        requires_metoken: false,
        metoken_price: null,
        allow_clipping: true,
        story_ip_id: null,
        story_license_terms_id: null,
        story_commercial_rev_share: null,
      });
    }

    return NextResponse.json({
      playback_id: stream.playback_id,
      name: stream.name,
      thumbnail_url: stream.thumbnail_url,
      is_live: stream.is_live,
      last_live_at: stream.last_live_at,
      requires_metoken: stream.requires_metoken ?? false,
      metoken_price: stream.metoken_price ?? null,
      allow_clipping: stream.allow_clipping ?? true,
      story_ip_id: stream.story_ip_id ?? null,
      story_license_terms_id: stream.story_license_terms_id ?? null,
      story_commercial_rev_share: stream.story_commercial_rev_share ?? null,
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
