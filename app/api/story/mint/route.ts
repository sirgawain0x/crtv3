/**
 * Story Protocol NFT minting — server-side signing disabled (security).
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: "Story is disabled" }, { status: 503 });
}
