import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { z } from "zod";
import { isAddress } from "viem";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { requireWalletAuthFor, WalletAuthError } from "@/lib/auth/require-wallet";
import { createStreamRecord, getStreamByCreator } from "@/services/streams";
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
  name: z.string().min(1),
  profiles: z.array(streamProfileSchema).min(1),
  record: z.boolean(),
  playbackPolicy: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { creatorAddress, name, profiles, record, playbackPolicy } = parsed.data;
  const normalizedCreator = creatorAddress.toLowerCase();

  try {
    await requireWalletAuthFor(req, normalizedCreator);
  } catch (authErr) {
    if (authErr instanceof WalletAuthError) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    throw authErr;
  }

  const existing = await getStreamByCreator(normalizedCreator);
  if (existing) {
    return NextResponse.json(
      {
        error: "Stream already exists for this creator",
        streamId: existing.stream_id,
        playbackId: existing.playback_id,
      },
      { status: 409 },
    );
  }

  const apiKey = process.env.LIVEPEER_FULL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Livepeer API key not configured" },
      { status: 500 },
    );
  }

  try {
    const livepeerRes = await fetch("https://livepeer.studio/api/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ name, profiles, record, playbackPolicy }),
    });

    const data = await livepeerRes.json();
    if (!livepeerRes.ok) {
      return NextResponse.json(data, { status: livepeerRes.status });
    }

    const streamKeyValue = data.streamKey || data.stream?.streamKey;
    const streamIdValue = data.id || data.stream?.id;
    const playbackIdValue = data.playbackId || data.stream?.playbackId;

    if (!streamKeyValue || !streamIdValue || !playbackIdValue) {
      serverLogger.error("Livepeer create stream missing fields:", data);
      return NextResponse.json(
        { error: "Livepeer response missing stream identifiers" },
        { status: 502 },
      );
    }

    await createStreamRecord({
      creator_id: normalizedCreator,
      stream_key: streamKeyValue,
      stream_id: streamIdValue,
      playback_id: playbackIdValue,
      name: name || `Channel-${normalizedCreator.slice(0, 6)}`,
      is_live: false,
    });

    return NextResponse.json({
      streamId: streamIdValue,
      playbackId: playbackIdValue,
      streamKey: streamKeyValue,
    });
  } catch (error) {
    serverLogger.error("Livepeer stream creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stream" },
      { status: 500 },
    );
  }
}
