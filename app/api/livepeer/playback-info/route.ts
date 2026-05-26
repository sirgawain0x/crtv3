import { NextRequest, NextResponse } from 'next/server';
import { getFullLivepeer } from '@/lib/sdk/livepeer/fullClient';
import {
  LIVEPEER_AUTH_FAILED,
  LIVEPEER_NOT_CONFIGURED,
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from '@/lib/sdk/livepeer/studioAuth';
import { serverLogger } from '@/lib/utils/logger';

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest) {
  try {
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

    const token = resolveLivepeerStudioAuthToken();
    if (!token) {
      return NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503 },
      );
    }

    const client = getFullLivepeer();
    if (client) {
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
    }

    const base = livepeerStudioApiBaseUrl();
    const livepeerRes = await fetch(
      `${base}/api/playback/${encodeURIComponent(playbackId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );

    if (livepeerRes.status === 401 || livepeerRes.status === 403) {
      return NextResponse.json(
        {
          error: 'Livepeer authentication failed',
          code: LIVEPEER_AUTH_FAILED,
        },
        { status: 502 },
      );
    }

    if (!livepeerRes.ok) {
      const details = await livepeerRes.text().catch(() => '');
      serverLogger.error(
        `Livepeer playback-info ${livepeerRes.status} for ${playbackId}:`,
        details.slice(0, 200),
      );
      return NextResponse.json(
        {
          error: 'Failed to fetch playback info',
          code: 'LIVEPEER_UPSTREAM_ERROR',
        },
        { status: livepeerRes.status >= 500 ? 502 : livepeerRes.status },
      );
    }

    return NextResponse.json(await livepeerRes.json());
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
