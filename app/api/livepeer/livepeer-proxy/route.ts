import { NextRequest, NextResponse } from "next/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { requireHumanOrVerifiedBot } from "@/lib/middleware/botIdGuard";
import {
  hasLivepeerPrivateApiKey,
  livepeerStudioApiBaseUrl,
} from "@/lib/sdk/livepeer/studioAuth";
import { serverLogger } from "@/lib/utils/logger";

export async function POST(req: NextRequest) {
  const botCheck = await requireHumanOrVerifiedBot("livepeer-proxy");
  if (!botCheck.allowed) {
    return botCheck.response;
  }

  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  if (!hasLivepeerPrivateApiKey()) {
    serverLogger.error("[livepeer-proxy] LIVEPEER_FULL_API_KEY is not configured");
    return NextResponse.json(
      {
        error: "Missing Livepeer API key",
        code: "MISSING_API_KEY",
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const baseUrl = livepeerStudioApiBaseUrl();
  const livepeerRes = await fetch(`${baseUrl}/api/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await livepeerRes.json()) as Record<string, unknown>;
  } catch {
    serverLogger.error("[livepeer-proxy] Livepeer returned non-JSON response", {
      status: livepeerRes.status,
    });
    return NextResponse.json(
      {
        error: "Invalid response from streaming provider",
        code: "LIVEPEER_ERROR",
      },
      { status: 502 },
    );
  }

  if (!livepeerRes.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : "Failed to create stream";

    serverLogger.error("[livepeer-proxy] Livepeer stream create failed", {
      status: livepeerRes.status,
      message,
    });

    return NextResponse.json(
      {
        error: message,
        code: "LIVEPEER_ERROR",
        details: data,
      },
      { status: livepeerRes.status },
    );
  }

  serverLogger.debug("[livepeer-proxy] stream created", {
    streamId: data.id,
    playbackId: data.playbackId,
  });

  return NextResponse.json(data, { status: livepeerRes.status });
}
