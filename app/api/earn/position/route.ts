import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from "next/server";
import { requirePrivyAuth } from "@/lib/auth/privy-server-auth";
import { isEarnConfigured } from "@/lib/sdk/privy/config";
import { fetchVaultPosition } from "@/lib/sdk/privy/earn";
import { getEarnUsdcBalance } from "@/lib/earn/balance.server";
import type { Address } from "viem";

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: "earn.position" });
  if (!access.allowed) return access.response;

  if (!isEarnConfigured()) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Earn is not configured" },
      { status: 503 },
    ), access);
  }

  const auth = await requirePrivyAuth(request);
  if (auth instanceof Response) return withPlatformApiPaymentHeaders(auth, access);

  try {
    const [position, embeddedUsdcBalance] = await Promise.all([
      fetchVaultPosition(auth.embeddedWallet.walletId),
      getEarnUsdcBalance(auth.embeddedWallet.address as Address),
    ]);

    return withPlatformApiPaymentHeaders(NextResponse.json({
      position,
      embeddedWallet: {
        walletId: auth.embeddedWallet.walletId,
        address: auth.embeddedWallet.address,
        usdcBalance: embeddedUsdcBalance.toString(),
      },
    }), access);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch earn position";
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: message }, { status: 500 }), access);
  }
}
