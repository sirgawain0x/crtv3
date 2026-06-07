import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { fetchPrecogMarket } from "@/lib/predictions/precog-markets";

export async function GET(request: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.generous(request);
  if (rl) return rl;

  const chainId = parseInt(
    request.nextUrl.searchParams.get("chainId") ?? "",
    10
  );
  const marketId = parseInt(
    request.nextUrl.searchParams.get("marketId") ?? "",
    10
  );

  if (!Number.isFinite(chainId) || !Number.isFinite(marketId)) {
    return NextResponse.json(
      { error: "chainId and marketId are required" },
      { status: 400 }
    );
  }

  const data = await fetchPrecogMarket(chainId, marketId);
  if (!data) {
    return NextResponse.json({ market: null });
  }

  return NextResponse.json({ market: data });
}
