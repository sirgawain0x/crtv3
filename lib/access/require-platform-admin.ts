import type { NextRequest } from "next/server";
import { isPlatformAdmin } from "@/lib/access/platform-admin";
import { requireWalletAuth, WalletAuthError } from "@/lib/auth/require-wallet";

export class PlatformAdminAuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PlatformAdminAuthError";
  }
}

/** Wallet auth + platform admin address check (server routes). */
export async function requirePlatformAdmin(
  request: NextRequest,
): Promise<{ address: string }> {
  try {
    const { address } = await requireWalletAuth(request);
    if (!isPlatformAdmin(address)) {
      throw new PlatformAdminAuthError(403, "Platform admin wallet required");
    }
    return { address };
  } catch (error) {
    if (error instanceof WalletAuthError) {
      throw new PlatformAdminAuthError(error.status, error.message);
    }
    throw error;
  }
}
