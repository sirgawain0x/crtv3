import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { requireWalletAuthFor, WalletAuthError } from "@/lib/auth/require-wallet";
import { getStreamByCreator } from "@/services/streams";

/**
 * Owner-only: return RTMP/WHIP stream key for the authenticated creator's channel.
 */
export async function GET(req: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  const creatorAddress = req.nextUrl.searchParams.get("creatorAddress")?.trim();
  if (!creatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(creatorAddress)) {
    return NextResponse.json({ error: "Valid creatorAddress query param required" }, { status: 400 });
  }

  const normalizedCreator = creatorAddress.toLowerCase();

  try {
    await requireWalletAuthFor(req, normalizedCreator);
  } catch (authErr) {
    if (authErr instanceof WalletAuthError) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    throw authErr;
  }

  const stream = await getStreamByCreator(normalizedCreator);
  if (!stream) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  return NextResponse.json({
    streamId: stream.stream_id,
    playbackId: stream.playback_id,
    streamKey: stream.stream_key,
  });
}
