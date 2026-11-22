import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";
import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { isAddress } from "viem";
import { NextRequest, NextResponse } from "next/server";
import { unlockService } from "@/lib/sdk/unlock/services";
import { rateLimiters } from "@/lib/middleware/rateLimit";

// POST /api/membership — read-only Unlock lookup protected by Platform API access.
export async function POST(req: NextRequest) {
  const access = await requirePlatformApiAccess(req, { resource: 'membership.lookup' });
  if (!access.allowed) return access.response;

  const rl = await rateLimiters.standard(req);
  if (rl) return withPlatformApiPaymentHeaders(rl, access);

  let address: string | undefined;

  try {
    const body = await req.json();
    address = body.address;
  } catch {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "Invalid request body" }, { status: 400 }), access);
  }

  if (typeof address !== "string" || !isAddress(address)) {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "A valid wallet address is required" }, { status: 400 }), access);
  }

  try {
    // This runs server-side, so no CORS issues!
    const memberships = await unlockService.getAllMemberships(address);
    if (memberships.some((membership) => "error" in membership)) {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        { error: "Membership verification is temporarily unavailable. Please retry." },
        { status: 503 },
      ), access);
    }
    return withPlatformApiPaymentHeaders(NextResponse.json({ memberships }, { status: 200 }), access);
  } catch {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Membership verification is temporarily unavailable. Please retry." },
      { status: 500 }
    ), access);
  }
}
