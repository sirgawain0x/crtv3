import { NextRequest, NextResponse } from "next/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { requireWalletAuthFor, WalletAuthError } from "@/lib/auth/require-wallet";
import { resolveStreamForCreator } from "@/services/streams";
import {
  defaultStreamCreateOptions,
  ensureLivepeerStreamForCreator,
} from "@/lib/livepeer/ensure-stream";
import { serverLogger } from "@/lib/utils/logger";

/**
 * Owner-only: return RTMP/WHIP stream key for the authenticated creator's channel.
 * Validates the Livepeer stream still exists; recreates credentials if Studio returns 404.
 */
export async function GET(req: NextRequest) {
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  const creatorAddress = req.nextUrl.searchParams.get("creatorAddress")?.trim();
  if (!creatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(creatorAddress)) {
    return NextResponse.json({ error: "Valid creatorAddress query param required" }, { status: 400 });
  }

  const legacyCreatorAddress =
    req.nextUrl.searchParams.get("legacyCreatorAddress")?.trim() || undefined;

  const normalizedCreator = creatorAddress.toLowerCase();

  try {
    await requireWalletAuthFor(req, normalizedCreator);
  } catch (authErr) {
    if (authErr instanceof WalletAuthError) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    throw authErr;
  }

  const stream = await resolveStreamForCreator(
    normalizedCreator,
    legacyCreatorAddress?.toLowerCase(),
  );
  if (!stream) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  try {
    const defaults = defaultStreamCreateOptions(normalizedCreator);
    const ensured = await ensureLivepeerStreamForCreator({
      ...defaults,
      name: stream.name || defaults.name,
      record: stream.save_recording !== false,
      existing: stream,
    });

    if (ensured.replaced) {
      serverLogger.info("[stream-key] healed stale Livepeer credentials", {
        creatorId: normalizedCreator,
        streamId: ensured.streamId,
      });
    }

    return NextResponse.json({
      streamId: ensured.streamId,
      playbackId: ensured.playbackId,
      streamKey: ensured.streamKey,
      replaced: ensured.replaced,
      reused: ensured.reused,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_API_KEY") {
      return NextResponse.json(
        { error: "Missing Livepeer API key", code: "MISSING_API_KEY" },
        { status: 500 },
      );
    }
    serverLogger.error("[stream-key] ensure Livepeer stream failed", {
      creatorId: normalizedCreator,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to resolve stream key",
        code: "LIVEPEER_ERROR",
      },
      { status: 502 },
    );
  }
}
