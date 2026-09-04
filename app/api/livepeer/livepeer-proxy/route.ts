import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "viem";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { requireWalletAuthFor, WalletAuthError } from "@/lib/auth/require-wallet";
import { resolveStreamForCreator } from "@/services/streams";
import { ensureLivepeerStreamForCreator } from "@/lib/livepeer/ensure-stream";
import { hasLivepeerPrivateApiKey } from "@/lib/sdk/livepeer/studioAuth";
import { serverLogger } from "@/lib/utils/logger";

const streamProfileSchema = z.object({
  name: z.string(),
  width: z.number(),
  height: z.number(),
  bitrate: z.number(),
  fps: z.number(),
  fpsDen: z.number(),
  quality: z.number(),
  gop: z.string(),
  profile: z.string(),
});

const bodySchema = z.object({
  creatorAddress: z.string().refine(isAddress, "Invalid creatorAddress"),
  legacyCreatorAddress: z.string().refine(isAddress, "Invalid legacyCreatorAddress").optional(),
  name: z.string().min(1),
  profiles: z.array(streamProfileSchema).min(1),
  record: z.boolean(),
  playbackPolicy: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors, code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const { creatorAddress, legacyCreatorAddress, name, profiles, record, playbackPolicy } =
    parsed.data;
  const normalizedCreator = creatorAddress.toLowerCase();

  try {
    await requireWalletAuthFor(req, normalizedCreator);
  } catch (authErr) {
    if (authErr instanceof WalletAuthError) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    throw authErr;
  }

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

  const existing = await resolveStreamForCreator(
    normalizedCreator,
    legacyCreatorAddress?.toLowerCase(),
  );

  try {
    const ensured = await ensureLivepeerStreamForCreator({
      creatorId: normalizedCreator,
      name,
      profiles,
      record,
      playbackPolicy,
      existing,
    });

    if (ensured.reused) {
      return NextResponse.json(
        {
          error: "Stream already exists for this creator",
          code: "STREAM_EXISTS",
          streamId: ensured.streamId,
          playbackId: ensured.playbackId,
          streamKey: ensured.streamKey,
        },
        { status: 409 },
      );
    }

    if (ensured.replaced) {
      serverLogger.info("[livepeer-proxy] healed stale Livepeer stream", {
        creatorId: normalizedCreator,
        streamId: ensured.streamId,
      });
    } else {
      serverLogger.debug("[livepeer-proxy] stream created", {
        streamId: ensured.streamId,
        playbackId: ensured.playbackId,
      });
    }

    return NextResponse.json({
      streamId: ensured.streamId,
      playbackId: ensured.playbackId,
      streamKey: ensured.streamKey,
      replaced: ensured.replaced,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_API_KEY") {
      return NextResponse.json(
        { error: "Missing Livepeer API key", code: "MISSING_API_KEY" },
        { status: 500 },
      );
    }

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;

    const details =
      typeof error === "object" && error !== null && "details" in error
        ? (error as { details: unknown }).details
        : undefined;

    serverLogger.error("[livepeer-proxy] Livepeer stream creation error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create stream",
        code: "LIVEPEER_ERROR",
        ...(details !== undefined ? { details } : {}),
      },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
