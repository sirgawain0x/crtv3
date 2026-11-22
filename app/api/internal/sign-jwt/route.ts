import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/middleware/rateLimit';
import { handleSignJwt } from '@/lib/livepeer/sign-jwt-handler';

/**
 * Internal, first-party signed-JWT endpoint used by the in-app video player.
 * Uses Basic BotID for browser access; external agents require payment.
 * External consumers should use /api/livepeer/sign-jwt.
 */
export async function POST(req: NextRequest) {
  const access = await requirePlatformApiAccess(req, { resource: "playback.sign" });
  if (!access.allowed) return access.response;

  const rl = await rateLimiters.standard(req);
  if (rl) return withPlatformApiPaymentHeaders(rl, access);

  return withPlatformApiPaymentHeaders(handleSignJwt(req), access);
}
