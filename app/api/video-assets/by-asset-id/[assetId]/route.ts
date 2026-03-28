import { NextRequest, NextResponse } from "next/server";
import { getVideoAssetByAssetId } from "@/services/video-assets";
import { serverLogger } from "@/lib/utils/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    const asset = await getVideoAssetByAssetId(assetId);

    if (!asset) {
      return NextResponse.json(
        { error: "Video asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(asset, { status: 200 });
  } catch (error) {
    serverLogger.error("Error fetching video asset by asset ID:", error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Check for database connection errors
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'Database connection error',
            details: 'Unable to connect to the database. Please try again later.'
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: "Failed to fetch video asset",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

