import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/middleware/rateLimit';
import { handlePlaybackInfo } from '@/lib/livepeer/playback-info-handler';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Internal, first-party playback info endpoint used by the in-app video player.
 * Uses the same verified-browser / authenticated-internal-agent / paid gate as the public API.
 * External consumers should use /api/livepeer/playback-info.
 */
export async function GET(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: "playback.info" });
  if (!access.allowed) return access.response;

  const rl = await rateLimiters.playbackInfo(request);
  if (rl) return withPlatformApiPaymentHeaders(rl, access);

  return withPlatformApiPaymentHeaders(handlePlaybackInfo(request), access);
}
