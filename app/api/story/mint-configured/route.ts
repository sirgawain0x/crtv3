/**
 * GET /api/story/mint-configured
 *
 * Returns whether Story Protocol NFT minting is configured (STORY_PROTOCOL_PRIVATE_KEY set).
 * Used by the upload flow to hide or show the NFT minting step.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const configured = !!process.env.STORY_PROTOCOL_PRIVATE_KEY;
  return NextResponse.json({ configured });
}
