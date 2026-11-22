import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from "next/server";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { fetchPrecogMarket } from "@/lib/predictions/precog-markets";

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: "predictions.precog" });
  if (!access.allowed) return access.response;

  const verification = await checkBotIdDeep();
  if (verification.isBot) {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Access denied" }, { status: 403 }), access);
  }
  const rl = await rateLimiters.generous(request);
  if (rl) return withPlatformApiPaymentHeaders(rl, access);

  const chainIdStr = request.nextUrl.searchParams.get("chainId");
  const marketIdStr = request.nextUrl.searchParams.get("marketId");

  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : NaN;
  const marketId = marketIdStr ? parseInt(marketIdStr, 10) : NaN;

  if (
    !Number.isInteger(chainId) ||
    chainId <= 0 ||
    !Number.isInteger(marketId) ||
    marketId <= 0
  ) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Valid positive integer chainId and marketId are required" },
      { status: 400 }
    ), access);
  }

  const data = await fetchPrecogMarket(chainId, marketId);
  if (!data) {
    return withPlatformApiPaymentHeaders(NextResponse.json({ market: null }), access);
  }

  return withPlatformApiPaymentHeaders(NextResponse.json({ market: data }), access);
}
