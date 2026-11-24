import { NextRequest, NextResponse } from "next/server";
import {
  requirePlatformAdmin,
  PlatformAdminAuthError,
} from "@/lib/access/require-platform-admin";
import { createServiceClient } from "@/lib/sdk/supabase/service";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import {
  channelMigrationEnvironment,
  prepareStoredStreamReplacement,
} from "@/lib/video-provider/migration/stream-replacement-server";
import { assertStreamSnapshot } from "@/lib/video-provider/migration/stream-replacements";
export const runtime = "nodejs";
export const maxDuration = 120;
const respond = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(request: NextRequest) {
  if (!channelMigrationEnvironment())
    return respond({ error: "Not found" }, 404);
  try {
    await requirePlatformAdmin(request);
  } catch (error) {
    if (error instanceof PlatformAdminAuthError)
      return respond({ error: error.message }, error.status);
    return respond({ error: "Admin authorization unavailable" }, 503);
  }
  const limited = await rateLimiters.standard(request);
  if (limited) return limited;
  let snapshot;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 4096) throw new Error();
    snapshot = JSON.parse(raw);
    assertStreamSnapshot(snapshot);
  } catch {
    return respond(
      { error: "One reviewed offline channel snapshot is required" },
      400,
    );
  }
  try {
    return respond(
      await prepareStoredStreamReplacement(createServiceClient(), snapshot),
    );
  } catch {
    return respond(
      {
        error:
          "Channel preparation stopped. Inspect its private reservation before continuing; no automatic creation retry is permitted.",
      },
      409,
    );
  }
}
