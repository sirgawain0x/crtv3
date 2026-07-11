import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/sdk/supabase/service";
import { getStoredViewsCount } from "@/lib/livepeer/sync-view-count";
import { serverLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playbackId: string }> }
) {
  try {
    const { playbackId } = await params;

    if (!playbackId || !playbackId.trim()) {
      return NextResponse.json(
        { error: "Playback ID is required", code: "PLAYBACK_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    
    // Fetch current stored views count
    const stored = await getStoredViewsCount(supabase, playbackId);
    const newViews = stored + 1;
    
    // Update view count in database
    const { error } = await supabase
      .from("video_assets")
      .update({ views_count: newViews })
      .eq("playback_id", playbackId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      playbackId,
      viewCount: newViews,
    });
  } catch (error) {
    serverLogger.error("Error incrementing view count:", error);
    return NextResponse.json(
      {
        error: "Database error",
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
