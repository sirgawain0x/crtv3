import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rateLimit';
import { serverLogger } from '@/lib/utils/logger';
import {
  buildOrbUpstreamHeaders,
  ORB_QR_POLL_UPSTREAM,
} from '@/lib/sdk/orb/qr-proxy';

/** Same-origin proxy for Orb QR poll (avoids browser CORS to orbapi.xyz). */
export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, {
    maxRequests: 90,
    windowMs: 60 * 1000,
    errorMessage: 'Too many QR poll requests. Please try again.',
  });
  if (rl) return rl;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const secret =
    typeof body === 'object' &&
    body !== null &&
    'secret' in body &&
    typeof (body as { secret: unknown }).secret === 'string'
      ? (body as { secret: string }).secret.trim()
      : '';

  if (!secret) {
    return NextResponse.json({ error: 'secret is required' }, { status: 400 });
  }

  try {
    const res = await fetch(ORB_QR_POLL_UPSTREAM, {
      method: 'POST',
      headers: {
        ...buildOrbUpstreamHeaders(request),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secret }),
      cache: 'no-store',
    });

    const text = await res.text();
    if (!res.ok) {
      serverLogger.warn('Orb QR poll upstream error', {
        status: res.status,
        origin: request.headers.get('origin') ?? '(none)',
        bodyPreview: text.slice(0, 200),
      });
    }
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    serverLogger.error('Orb QR poll proxy failed:', error);
    return NextResponse.json(
      { error: 'Failed to reach Orb sign-in service' },
      { status: 502 },
    );
  }
}
