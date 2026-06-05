import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { enableStreamRecording } from "@/lib/livepeer/studio-api";
import { serverLogger } from "@/lib/utils/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  const { streamId } = await params;
  if (!streamId?.trim()) {
    return NextResponse.json({ error: "streamId is required" }, { status: 400 });
  }

  try {
    await enableStreamRecording(streamId.trim());
    return NextResponse.json({ ok: true, record: true });
  } catch (e: unknown) {
    serverLogger.error("Failed to enable stream recording:", e);
    const message =
      e instanceof Error ? e.message : "Failed to enable stream recording";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
