import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/predictions/social-sync/cron
 * Dual-post new Reality.eth questions (and answers) to X and Mastodon.
 *
 * Auth: Bearer CRON_SECRET (same as other Vercel crons).
 * One-time: ?init=1 seeds Supabase cursor from the current timestamp.
 *
 * Auth first, then cron-handler. Question text is parsed locally (no
 * reality-eth-lib/jsdom). Twitter client (twit) loads lazily when posting.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { handleSocialSyncCron } = await import("@/lib/reality-social/cron-handler");
  return handleSocialSyncCron(request);
}
