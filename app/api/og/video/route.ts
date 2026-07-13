import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getVideoAssetByAssetId,
  getVideoAssetByPlaybackId,
} from "@/services/video-assets";
import { convertFailingGateway } from "@/lib/utils/image-gateway";
import { serverLogger } from "@/lib/utils/logger";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 8_000;
const CACHE_HEADER =
  "public, s-maxage=86400, stale-while-revalidate=604800";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fallbackImage(): Promise<NextResponse> {
  const filePath = path.join(process.cwd(), "public", "Creative_TV.png");
  const buffer = await readFile(filePath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": CACHE_HEADER,
    },
  });
}

function isUsableRemoteUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes("storage.googleapis.com/lp-ai-generate-com")) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchRemoteImage(
  url: string
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/*,*/*" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType && !contentType.startsWith("image/")) return null;
    const body = await res.arrayBuffer();
    if (!body.byteLength) return null;
    return {
      body,
      contentType: contentType.startsWith("image/")
        ? contentType
        : "image/jpeg",
    };
  } catch (err) {
    serverLogger.warn("OG video image fetch failed:", { url, err });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveThumbnailUrl(
  id: string | null,
  playbackId: string | null
): Promise<string | null> {
  if (id) {
    if (!UUID_REGEX.test(id)) return null;
    const asset = await getVideoAssetByAssetId(id).catch((err) => {
      serverLogger.warn("OG video: getVideoAssetByAssetId failed", err);
      return null;
    });
    const raw = (asset as { thumbnail_url?: string | null } | null)
      ?.thumbnail_url;
    if (raw?.trim()) return convertFailingGateway(raw.trim());
  }

  if (playbackId) {
    const asset = await getVideoAssetByPlaybackId(playbackId).catch((err) => {
      serverLogger.warn("OG video: getVideoAssetByPlaybackId failed", err);
      return null;
    });
    const raw = asset?.thumbnail_url;
    if (raw?.trim()) return convertFailingGateway(raw.trim());
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    const playbackId = searchParams.get("playbackId");

    if (!id && !playbackId) {
      return fallbackImage();
    }

    const thumbnailUrl = await resolveThumbnailUrl(id, playbackId);

    if (thumbnailUrl && isUsableRemoteUrl(thumbnailUrl)) {
      const remote = await fetchRemoteImage(thumbnailUrl);
      if (remote) {
        return new NextResponse(remote.body, {
          status: 200,
          headers: {
            "Content-Type": remote.contentType,
            "Cache-Control": CACHE_HEADER,
          },
        });
      }
    }

    return fallbackImage();
  } catch (error) {
    serverLogger.error("OG video route error:", error);
    try {
      return await fallbackImage();
    } catch {
      return new NextResponse("OG image unavailable", { status: 500 });
    }
  }
}
