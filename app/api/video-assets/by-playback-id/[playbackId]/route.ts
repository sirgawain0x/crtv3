import { NextRequest, NextResponse } from "next/server";
import { getVideoAssetByPlaybackId } from "@/services/video-assets";
import { serverLogger } from "@/lib/utils/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playbackId: string }> }
) {
  try {
    const { playbackId } = await params;

    if (!playbackId) {
      return NextResponse.json(
        { error: "Playback ID is required" },
        { status: 400 }
      );
    }

    const asset = await getVideoAssetByPlaybackId(playbackId);

    if (!asset) {
      return NextResponse.json(
        { error: "Video asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(asset, { status: 200 });
  } catch (error) {
    serverLogger.error("Error fetching video asset by playback ID:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch video asset",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

