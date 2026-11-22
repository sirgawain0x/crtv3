import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isEarnConfigured } from "@/lib/sdk/privy/config";
import { fetchVaultDetails } from "@/lib/sdk/privy/earn";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: "earn.vault" });
  if (!access.allowed) return access.response;

  if (!isEarnConfigured()) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Earn is not configured" },
      { status: 503 },
    ), access);
  }

  try {
    const vault = await fetchVaultDetails();
    return withPlatformApiPaymentHeaders(NextResponse.json({ vault }), access);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch vault";
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: message }, { status: 500 }), access);
  }
}
