import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { serverLogger } from "@/lib/utils/logger";

export const BOTID_DENIED_CODE = "BOTID_DENIED" as const;

export type BotIdGuardResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse };

/**
 * Run BotID verification. Blocks unverified bots; allows humans and verified bots.
 */
export async function requireHumanOrVerifiedBot(
  context?: string,
): Promise<BotIdGuardResult> {
  const verification = await checkBotId();

  if (verification.isBot && !verification.isVerifiedBot) {
    serverLogger.warn("[botIdGuard] access denied", {
      context,
      isVerifiedBot: verification.isVerifiedBot,
      verifiedBotName: verification.verifiedBotName,
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
