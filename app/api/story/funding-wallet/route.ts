/**
 * Story Protocol funding wallet — endpoint removed (security).
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  return new NextResponse(null, { status: 404 });
}
