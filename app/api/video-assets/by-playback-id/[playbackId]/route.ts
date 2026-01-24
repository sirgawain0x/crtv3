import { NextRequest, NextResponse } from "next/server";
import { getVideoAssetByPlaybackId } from "@/services/video-assets";
import { serverLogger } from "@/lib/utils/logger";

// Configure route segment to prevent timeout issues
export const maxDuration = 30; // 30 seconds max (well below Vercel's 300s limit)
export const runtime = 'nodejs';

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
    
    // Handle specific error types
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      // Check for Supabase connection errors
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('Supabase service temporarily unavailable')
      ) {
        return NextResponse.json(
          {
            error: 'Database connection error',
            details: 'Unable to connect to the database. Please try again later.',
          },
          { status: 503 } // Service Unavailable
        );
      }

      // Check for HTML error responses (Cloudflare errors)
      if (errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html')) {
        return NextResponse.json(
          {
            error: 'Supabase service error',
            details: 'The database service is temporarily unavailable. Please try again in a few minutes.',
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

