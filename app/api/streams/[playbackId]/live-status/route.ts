import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from 'next/server';
import { getStreamByPlaybackId } from '@/services/streams';

/** Lens checkLiveAPI-compatible endpoint: { isLive: boolean } */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ playbackId: string }> },
) {
  const access = await requirePlatformApiAccess(_request, { resource: "streams.status" });
  if (!access.allowed) return access.response;

  try {
    const { playbackId } = await params;
    if (!playbackId?.trim()) {
      return withPlatformApiPaymentHeaders(NextResponse.json({ isLive: false }, { status: 400 }), access);
    }

    const stream = await getStreamByPlaybackId(playbackId);
    return withPlatformApiPaymentHeaders(NextResponse.json({ isLive: Boolean(stream?.is_live) }), access);
  } catch {
    return withPlatformApiPaymentHeaders(NextResponse.json({ isLive: false }, { status: 500 }), access);
  }
}
