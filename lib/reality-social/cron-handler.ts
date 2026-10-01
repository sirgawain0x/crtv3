import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRealitySocialConfig, hasMastodonCredentials, hasTwitterCredentials } from "@/lib/reality-social/config";
import { syncRealitySocialForChain } from "@/lib/reality-social/sync-chain";
import { serverLogger } from "@/lib/utils/logger";

/**
 * Cron body for /api/predictions/social-sync/cron (loaded after auth in route.ts).
 */
export async function handleSocialSyncCron(request: NextRequest): Promise<NextResponse> {
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
