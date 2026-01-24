import { fetchLockAndKey } from "@/lib/sdk/unlock/services";
import { NextRequest, NextResponse } from "next/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";

export async function POST(req: NextRequest) {
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  const { lockAddress, userAddress, network } = await req.json();
  try {
    const { lock, key } = await fetchLockAndKey({
      lockAddress,
      userAddress,
      network,
    });
    return NextResponse.json({ lock, key });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
