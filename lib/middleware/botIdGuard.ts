import { checkBotId } from "botid/server";
import { NextRequest, NextResponse } from "next/server";
import { serverLogger } from "@/lib/utils/logger";

export const BOTID_DENIED_CODE = "BOTID_DENIED" as const;

/** Must match Vercel Firewall → BotID → Deep Analysis and instrumentation-client.ts. */
export const BOTID_DEEP_ANALYSIS_OPTIONS = {
  advancedOptions: { checkLevel: "deepAnalysis" as const },
} satisfies NonNullable<Parameters<typeof checkBotId>[0]>;

export type BotIdGuardResult =
  | { allowed: true; paymentResponse?: string }
  | { allowed: false; response: NextResponse };

/** Server-side BotID check using Deep Analysis (Kasada). */
export async function checkBotIdDeep() {
  return checkBotId(BOTID_DEEP_ANALYSIS_OPTIONS);
}

/**
 * Legacy name retained for callers. Verified bots do not receive a free bypass.
 * Request-aware callers use the paid/internal-agent gate and retain their own wallet/owner checks.
 */
export async function requireHumanOrVerifiedBot(
  context?: string,
  request?: NextRequest,
): Promise<BotIdGuardResult> {
  if (request) {
    const { requirePlatformApiAccess } = await import("./platformApiAccess");
    return requirePlatformApiAccess(request, { resource: context ?? "agent.access" });
  }
  const verification = await checkBotIdDeep();

  if (verification.isHuman !== true || verification.isBot !== false ||
      (verification.bypassed && process.env.NODE_ENV === "production")) {
    serverLogger.warn("[botIdGuard] access denied", {
      context,
      isBot: verification.isBot,
      isVerifiedBot: verification.isVerifiedBot,
    });

    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Access denied",
          code: BOTID_DENIED_CODE,
        },
        { status: 403 },
      ),
    };
  }

  return { allowed: true };
}
