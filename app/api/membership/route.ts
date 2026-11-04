import { isAddress } from "viem";
import { NextRequest, NextResponse } from "next/server";
import { unlockService } from "@/lib/sdk/unlock/services";
import { rateLimiters } from "@/lib/middleware/rateLimit";

// POST /api/membership — read-only Unlock lookup; excluded from BotID (see instrumentation-client.ts).
export async function POST(req: NextRequest) {
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  let address: string | undefined;

  try {
    const body = await req.json();
    address = body.address;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof address !== "string" || !isAddress(address)) {
    return NextResponse.json({ error: "A valid wallet address is required" }, { status: 400 });
  }

  try {
    // This runs server-side, so no CORS issues!
    const memberships = await unlockService.getAllMemberships(address);
    if (memberships.some((membership) => "error" in membership)) {
      return NextResponse.json(
        { error: "Membership verification is temporarily unavailable. Please retry." },
        { status: 503 },
      );
    }
    return NextResponse.json({ memberships }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Membership verification is temporarily unavailable. Please retry." },
      { status: 500 }
    );
  }
}
