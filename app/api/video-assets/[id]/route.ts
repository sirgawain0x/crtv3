import { NextRequest, NextResponse } from "next/server";
import { getVideoAssetById } from "@/services/video-assets";
import { serverLogger } from "@/lib/utils/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id, 10);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: "Invalid video ID" },
        { status: 400 }
      );
    }

    const asset = await getVideoAssetById(videoId);

    if (!asset) {
      return NextResponse.json(
        { error: "Video asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(asset, { status: 200 });
  } catch (error) {
    serverLogger.error("Error fetching video asset by ID:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch video asset",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

