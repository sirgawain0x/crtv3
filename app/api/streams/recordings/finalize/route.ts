import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";
import { NextRequest, NextResponse } from "next/server";
import { requireHumanOrVerifiedBot } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { finalizeStreamRecordings } from "@/services/livestream-recordings";
import { serverLogger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  const botCheck = await requireHumanOrVerifiedBot("stream-recordings-finalize", request);
  if (!botCheck.allowed) {
    return botCheck.response;
  }

  const rl = await rateLimiters.standard(request);
  if (rl) return withPlatformApiPaymentHeaders(rl, botCheck);

  let body: { streamId?: string };
  try {
    body = await request.json();
  } catch {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }), botCheck);
  }

  const { streamId } = body ?? {};
  if (!streamId?.trim()) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "streamId is required" },
      { status: 400 }
    ), botCheck);
  }

  try {
    const result = await finalizeStreamRecordings(streamId.trim());
    return withPlatformApiPaymentHeaders(NextResponse.json(result), botCheck);
  } catch (e: unknown) {
    serverLogger.error("Failed to finalize stream recordings:", e);
    const message = e instanceof Error ? e.message : "Failed to finalize recordings";
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: message }, { status: 500 }), botCheck);
  }
}
