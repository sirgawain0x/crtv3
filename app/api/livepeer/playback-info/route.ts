import { NextRequest, NextResponse } from 'next/server';
import { getFullLivepeer } from '@/lib/sdk/livepeer/fullClient';
import { LIVEPEER_NOT_CONFIGURED } from '@/lib/sdk/livepeer/studioAuth';
import { serverLogger } from '@/lib/utils/logger';
import {
  platformApiOptionsResponse,
  requirePlatformApiAccess,
} from '@/lib/middleware/platformApiAccess';

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export async function OPTIONS() {
  return platformApiOptionsResponse();
}

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: 'playback.info' });
  if (!access.allowed) {
    return access.response;
  }

  try {
    if (!process.env.LIVEPEER_FULL_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Livepeer playback is not configured on this deployment' },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const playbackId = searchParams.get('playbackId');

    if (!playbackId) {
      return NextResponse.json(
        { error: 'Playback ID is required', code: 'PLAYBACK_ID_REQUIRED' },
        { status: 400 },
      );
    }

    if (ethereumAddressRegex.test(playbackId)) {
      return NextResponse.json(
        {
          error:
            'Invalid playback ID format. Expected Livepeer playback ID, received Ethereum address.',
          code: 'INVALID_PLAYBACK_ID',
        },
        { status: 400 },
      );
    }

    const client = getFullLivepeer();
    if (!client) {
      return NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503 },
      );
    }

    const response = await client.playback.get(playbackId);

    if (response.error) {
      return NextResponse.json(
        {
          error: 'Playback info not found',
          details: response.error,
          code: 'PLAYBACK_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    if (!response.playbackInfo) {
      return NextResponse.json(
        { error: 'Playback info not found', code: 'PLAYBACK_NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json(response.playbackInfo);
  } catch (error: unknown) {
    serverLogger.error('Error fetching playback info:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to fetch playback info';

    if (message === 'LIVEPEER_NOT_CONFIGURED') {
      return NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: message,
        code: 'PLAYBACK_INFO_ERROR',
      },
      { status: 500 },
    );
  }
}
