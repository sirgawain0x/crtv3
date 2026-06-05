import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { finalizeStreamRecordings } from "@/services/livestream-recordings";
import { serverLogger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  let body: { streamId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { streamId } = body ?? {};
  if (!streamId?.trim()) {
    return NextResponse.json(
      { error: "streamId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await finalizeStreamRecordings(streamId.trim());
    return NextResponse.json(result);
  } catch (e: unknown) {
    serverLogger.error("Failed to finalize stream recordings:", e);
    const message = e instanceof Error ? e.message : "Failed to finalize recordings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
