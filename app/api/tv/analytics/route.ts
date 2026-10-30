import { NextRequest, NextResponse } from "next/server";
import { serverLogger } from "@/lib/utils/logger";
import type { TVAnalyticsEvent } from "@/lib/analytics/tv-events";

const ALLOWED_EVENTS = new Set<TVAnalyticsEvent>([
  "cast_start",
  "cast_error",
  "cast_end",
  "session_length",
  "airplay_start",
  "airplay_error",
  "tv_page_view",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body?.event as TVAnalyticsEvent | undefined;

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false, error: "Invalid event" }, { status: 400 });
    }

    serverLogger.info("[tv-analytics]", {
      event,
      surface: body.surface,
      playbackId: body.playbackId,
      assetId: body.assetId,
      castType: body.castType,
      sessionLengthMs: body.sessionLengthMs,
      errorMessage: body.errorMessage,
      timestamp: body.timestamp,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    serverLogger.error("[tv-analytics] failed to record event", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
