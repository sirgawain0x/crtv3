import { NextRequest, NextResponse } from "next/server";
import { getVideoAssetByAssetId } from "@/services/video-assets";
import { serverLogger } from "@/lib/utils/logger";
import {
  platformApiOptionsResponse,
  requirePlatformApiAccess,
} from "@/lib/middleware/platformApiAccess";
import { PLATFORM_API_CORS_HEADERS } from "@/lib/middleware/x402Gate";

export const maxDuration = 30;
export const runtime = "nodejs";

function jsonWithCors(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: PLATFORM_API_CORS_HEADERS,
  });
}

export async function OPTIONS() {
  return platformApiOptionsResponse();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const access = await requirePlatformApiAccess(request, { resource: "playback.resolve" });
  if (!access.allowed) {
    return access.response;
  }

  try {
    const { assetId } = await params;

    if (!assetId) {
      return jsonWithCors({ error: "Asset ID is required" }, { status: 400 });
    }

    const asset = await getVideoAssetByAssetId(assetId);

    if (!asset || asset.status !== "published") {
      return jsonWithCors({ error: "Video asset not found" }, { status: 404 });
    }

    if (!asset.playback_id) {
      return jsonWithCors({ error: "Playback ID not available" }, { status: 404 });
    }

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://tv.creativeplatform.xyz");

    return jsonWithCors({
      playbackId: asset.playback_id,
      title: asset.title,
      thumbnailUri: asset.thumbnailUri,
      requiresMetoken: Boolean(asset.requires_metoken),
      fallbackUrl: `${siteOrigin}/discover/${asset.asset_id}`,
    });
  } catch (error) {
    serverLogger.error("Error fetching playback by asset ID:", error);
    return jsonWithCors(
      {
        error: "Failed to fetch playback",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
