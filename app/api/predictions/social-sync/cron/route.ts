import { NextRequest, NextResponse } from "next/server";
import { getRealitySocialConfig, hasMastodonCredentials, hasTwitterCredentials } from "@/lib/reality-social/config";
import { syncRealitySocialForChain } from "@/lib/reality-social/sync-chain";
import { serverLogger } from "@/lib/utils/logger";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/predictions/social-sync/cron
 * Dual-post new Reality.eth questions (and answers) to X and Mastodon.
 *
 * Auth: Bearer CRON_SECRET (same as other Vercel crons).
 * One-time: ?init=1 seeds Supabase cursor from the current timestamp.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const init = request.nextUrl.searchParams.get("init") === "1";
  const config = getRealitySocialConfig();

  const channels = {
    twitter: config.twitterEnabled && hasTwitterCredentials(),
    mastodon: config.mastodonEnabled && hasMastodonCredentials(),
    noop: config.noop,
  };

  if (!channels.noop && !channels.twitter && !channels.mastodon) {
    return NextResponse.json(
      {
        error:
          "No social credentials configured. Set Twitter and/or Mastodon env vars, or REALITY_SOCIAL_NOOP=true for dry runs.",
      },
      { status: 503 },
    );
  }

  const results = [];

  try {
    for (const chainId of config.chainIds) {
      const chainResult = await syncRealitySocialForChain(chainId, { init });
      results.push(chainResult);
    }

    return NextResponse.json({
      ok: true,
      channels,
      siteBaseUrl: config.siteBaseUrl,
      results,
    });
  } catch (error) {
    serverLogger.error("[predictions/social-sync/cron] failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Social sync failed",
        results,
      },
      { status: 500 },
    );
  }
}
