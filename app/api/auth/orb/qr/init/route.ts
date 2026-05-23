import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { rateLimiters } from '@/lib/middleware/rateLimit';
import { serverLogger } from '@/lib/utils/logger';
import {
  buildOrbUpstreamHeaders,
  ORB_QR_INIT_UPSTREAM,
} from '@/lib/sdk/orb/qr-proxy';

const DEFAULT_CREDENTIALS = 'id_access_refresh';

/** Same-origin proxy for Orb QR init (avoids browser CORS to orbapi.xyz). */
export async function GET(request: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    serverLogger.warn('[orb/qr/init] BotID rejected request');
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const credentials =
    searchParams.get('credentials')?.trim() || DEFAULT_CREDENTIALS;

  const upstream = new URL(ORB_QR_INIT_UPSTREAM);
  upstream.searchParams.set('credentials', credentials);

  try {
    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: buildOrbUpstreamHeaders(request),
      cache: 'no-store',
    });

    const body = await res.text();
    if (!res.ok) {
      serverLogger.warn(
        `[orb/qr/init] upstream ${res.status} from ${ORB_QR_INIT_UPSTREAM}`,
      );
    }
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    serverLogger.error('Orb QR init proxy failed:', error);
    return NextResponse.json(
      { error: 'Failed to reach Orb sign-in service' },
      { status: 502 },
    );
  }
}
