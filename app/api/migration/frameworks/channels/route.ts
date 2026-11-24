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
import {isFrameworksMigrationStaging} from '@/lib/video-provider/migration/staging-runtime';
import {inspectMigrationPlayback} from '@/lib/video-provider/migration/inspect-playback';
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
  let snapshot,mode='prepare';
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 4096) throw new Error();
    const body=JSON.parse(raw);
    if(body?.mode==='inspect-playback'){mode=body.mode;snapshot=body.snapshot;}else snapshot=body;
    assertStreamSnapshot(snapshot);
  } catch {
    return respond(
      { error: "One reviewed offline channel snapshot is required" },
      400,
    );
  }
  if (mode === 'inspect-playback') {
    try {
      if (!isFrameworksMigrationStaging()) return respond({ error: 'Not found' }, 404);
      const { data: stream, error } = await createServiceClient()
        .from('streams')
        .select('creator_id,stream_id,playback_id,provider')
        .eq('id', snapshot.id)
        .single();
      if (
        error ||
        !stream ||
        stream.provider !== 'frameworks' ||
        stream.stream_id !== snapshot.stream_id ||
        stream.playback_id !== snapshot.playback_id ||
        stream.creator_id.toLowerCase() !== snapshot.creator_id.toLowerCase()
      ) {
        return respond({ error: 'Matching QA channel identity required' }, 409);
      }
      return respond({ diagnostic: await inspectMigrationPlayback(stream.playback_id) });
    } catch {
      return respond({
        diagnostic: { playableManifest: false, probeUnavailable: true },
      });
    }
  }
  try {
    return respond(await prepareStoredStreamReplacement(createServiceClient(), snapshot));
  } catch {
    return respond(
      {
        error:
          'Channel preparation stopped. Inspect its private reservation before continuing; no automatic creation retry is permitted.',
      },
      409,
    );
  }
}
