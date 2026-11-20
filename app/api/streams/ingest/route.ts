import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuthFor, WalletAuthError } from "@/lib/auth/require-wallet";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { getStreamByCreator } from "@/services/streams";
import { resolveStreamIngest } from "@/lib/video-provider/ingest";

export async function POST(request: NextRequest) {
  const limited = await rateLimiters.standard(request);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (typeof body?.creatorAddress !== "string" ||
      !/^0x[0-9a-f]{40}$/i.test(body.creatorAddress) ||
      !["WHIP", "RTMP"].includes(body.protocol)) {
    return NextResponse.json({ error: "Valid creator and ingest protocol required" }, { status: 400 });
  }
  const creator = body.creatorAddress.toLowerCase();
  try {
    await requireWalletAuthFor(request, creator);
    const stream = await getStreamByCreator(creator);
    if (!stream?.stream_key) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }
    const destination = await resolveStreamIngest(stream.stream_key, body.protocol);
    return NextResponse.json(destination, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WalletAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Provider errors may contain a key-bearing URL; never expose or log them.
    return NextResponse.json({ error: "Could not resolve streaming destination. Try again." }, { status: 502 });
  }
}
