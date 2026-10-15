import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/middleware/rateLimit';
import { serverLogger } from '@/lib/utils/logger';
import { extractOrbQrFailureFromBody } from '@/lib/sdk/orb/qr-init-response';
import {
  buildOrbUpstreamHeaders,
  ORB_QR_INIT_UPSTREAM,
} from '@/lib/sdk/orb/qr-proxy';

const DEFAULT_CREDENTIALS = 'id_access_refresh';

/** Same-origin proxy for Orb QR init (avoids browser CORS to orbapi.xyz). BotID omitted: QR polling is high-frequency and rate-limited instead. */
export async function GET(request: NextRequest) {
  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const credentials =
    searchParams.get('credentials')?.trim() || DEFAULT_CREDENTIALS;

  const upstream = new URL(ORB_QR_INIT_UPSTREAM);
  upstream.searchParams.set('credentials', credentials);
  const upstreamHeaders = buildOrbUpstreamHeaders(request);

  try {
    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: upstreamHeaders,
      cache: 'no-store',
    });

    const body = await res.text();
    const failureMessage = extractOrbQrFailureFromBody(body);

    if (!res.ok || failureMessage) {
      serverLogger.warn(
        `[orb/qr/init] upstream ${res.status} from ${ORB_QR_INIT_UPSTREAM}`,
        {
          failureMessage: failureMessage ?? null,
          origin: request.headers.get('origin') ?? '(derived)',
        },
      );
    }

    // Orb often returns HTTP 200 + { status: "FAILED", msg }. Pass the body through
    // so createOrbLogin({ parseInitResponse }) can throw that msg instead of the
    // opaque SDK "did not include qrCode and secret" error.
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
