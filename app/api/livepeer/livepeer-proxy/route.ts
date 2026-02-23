import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";

export async function POST(req: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  const body = await req.json();
  const livepeerRes = await fetch("https://livepeer.studio/api/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await livepeerRes.json();
  return NextResponse.json(data, { status: livepeerRes.status });
}
