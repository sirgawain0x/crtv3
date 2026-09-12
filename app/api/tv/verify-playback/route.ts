import { NextRequest, NextResponse } from "next/server";
import { isHttpsCastableUrl } from "@/lib/cast/extract-playback-url";
import { serverLogger } from "@/lib/utils/logger";

/**
 * Server-side check that a Livepeer HLS URL is HTTPS, on an expected CDN host,
 * and returns permissive CORS headers for Cast receivers.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ ok: false, error: "url required" }, { status: 400 });
  }

  if (!isHttpsCastableUrl(url)) {
    return NextResponse.json({
      ok: false,
      castable: false,
      reason: "URL is not an HTTPS Livepeer CDN endpoint",
    });
  }

  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    const corsOrigin = head.headers.get("access-control-allow-origin");
    const contentType = head.headers.get("content-type") ?? "";
    const cacheControl = head.headers.get("cache-control") ?? "";

    const castable =
      head.ok &&
      (contentType.includes("mpegurl") ||
        contentType.includes("octet-stream") ||
        url.includes(".m3u8"));

    return NextResponse.json({
      ok: true,
      castable,
      status: head.status,
      cors: {
        allowOrigin: corsOrigin,
        permissive: corsOrigin === "*" || corsOrigin != null,
      },
      contentType,
      cacheControl,
      note:
        "Signed Livepeer URLs remain valid for their TTL; refresh playback-info before casting long sessions.",
    });
  } catch (error) {
    serverLogger.warn("[tv/verify-playback] HEAD failed", { url, error });
    return NextResponse.json({
      ok: false,
      castable: false,
      reason: "Could not reach playback URL",
    });
  }
}
