import type { NextRequest } from 'next/server';

import {
  ORB_SDK_QR_INIT_DEFAULT,
  ORB_SDK_QR_POLL_DEFAULT,
} from '@/lib/sdk/orb/config';

export const ORB_QR_INIT_UPSTREAM = ORB_SDK_QR_INIT_DEFAULT;
export const ORB_QR_POLL_UPSTREAM = ORB_SDK_QR_POLL_DEFAULT;

/** orbapi.xyz requires Origin; forward the browser value or derive from the request. */
export function buildOrbUpstreamHeaders(request: NextRequest): HeadersInit {
  const origin = resolveRequestOrigin(request);
  const referer = request.headers.get('referer')?.trim() ?? origin;
  return {
    Accept: 'application/json',
    Origin: origin,
    Referer: referer,
  };
}

function resolveRequestOrigin(request: NextRequest): string {
  const fromHeader = request.headers.get('origin')?.trim();
  if (fromHeader) return fromHeader;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      return new URL(appUrl).origin;
    } catch {
      /* ignore invalid URL */
    }
  }

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) {
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https';
    return `${proto}://${host.split(',')[0].trim()}`;
  }

  return 'http://localhost:3000';
}
