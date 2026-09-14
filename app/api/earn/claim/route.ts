import { NextRequest, NextResponse } from "next/server";
import { requirePrivyAuth } from "@/lib/auth/privy-server-auth";
import { isEarnConfigured } from "@/lib/sdk/privy/config";
import { claimVaultIncentives, toActionSummary } from "@/lib/sdk/privy/earn";

export async function POST(request: NextRequest) {
  if (!isEarnConfigured()) {
    return NextResponse.json(
      { error: "Earn is not configured" },
      { status: 503 },
    );
  }

  const auth = await requirePrivyAuth(request);
  if (auth instanceof Response) return auth;

  try {
    const action = await claimVaultIncentives(
      auth.embeddedWallet.walletId,
      auth.accessToken,
    );

    return NextResponse.json({
      action: toActionSummary(action),
      walletId: auth.embeddedWallet.walletId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to claim rewards";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
