import { NextRequest, NextResponse } from 'next/server';
import { resolveFrameworksPlaybackAlias } from '@/lib/video-provider/frameworks/playback-alias';
import { getVideoProvider } from '@/lib/video-provider';
import { LIVEPEER_NOT_CONFIGURED } from '@/lib/sdk/livepeer/studioAuth';
import { serverLogger } from '@/lib/utils/logger';
import { handleSignJwt } from './sign-jwt-handler';

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

/**
 * Shared implementation used by both the public platform API route
 * (/api/livepeer/playback-info) and the first-party internal route
 * (/api/internal/playback-info). Callers are responsible for their own
 * access-control layer.
 */
export async function handlePlaybackInfo(request: NextRequest): Promise<NextResponse> {
  try {
    const provider = getVideoProvider();
    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: 'Video playback is not configured on this deployment', code: LIVEPEER_NOT_CONFIGURED },
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

    let canonicalPlaybackId = playbackId;
    if (provider.id === 'frameworks') {
      try { canonicalPlaybackId = await resolveFrameworksPlaybackAlias(playbackId); }
      catch { return NextResponse.json({ error: 'Playback lookup unavailable' }, { status: 503 }); }
    }
    // Reuse the same owner/publication/MeToken checks as the explicit token endpoint.
    // This is an in-process call, not an HTTP request or an authorization bypass.
    let viewerToken: string | undefined;
    if (provider.id === 'frameworks') {
      const authorization = await handleSignJwt(new NextRequest(request.url, {
        method: 'POST', headers: request.headers,
        body: JSON.stringify({ playbackId: canonicalPlaybackId,
          companionAddress: searchParams.get('companionAddress') ?? undefined }),
      }));
      if (!authorization.ok) return authorization;
      const result = await authorization.json();
      if (typeof result.token !== 'string' || !result.token) {
        return NextResponse.json({ error: 'Playback authorization unavailable' }, { status: 503 });
      }
      viewerToken = result.token;
    }
    const response = await provider.playback.get(canonicalPlaybackId);

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

    if (viewerToken) {
      const sources = response.playbackInfo.meta?.source ?? [];
      response.playbackInfo = { ...response.playbackInfo, meta: {
        ...response.playbackInfo.meta,
        source: sources.map(source => {
          if (!source.url) return source;
          const url = new URL(source.url);
          url.searchParams.set('jwt', viewerToken);
          return { ...source, url: url.toString() };
        }),
      } };
    }
    return NextResponse.json(response.playbackInfo, provider.id === 'frameworks'
      ? { headers: { 'Cache-Control': 'private, no-store' } } : undefined);
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
