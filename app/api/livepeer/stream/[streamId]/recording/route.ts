import { NextRequest, NextResponse } from "next/server";
import { requireHumanOrVerifiedBot } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { enableStreamRecording } from "@/lib/livepeer/studio-api";
import { serverLogger } from "@/lib/utils/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  const botCheck = await requireHumanOrVerifiedBot("stream-recording");
  if (!botCheck.allowed) {
    return botCheck.response;
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
