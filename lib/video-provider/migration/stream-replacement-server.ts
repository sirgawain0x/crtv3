import { frameworksReplayEnabled } from "@/lib/video-provider/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { frameworksStreams } from "../frameworks/streams";
import { frameworksGraphqlRequest } from "../frameworks-graphql";
import { requireVodSigningKeyId } from "../frameworks/vod-policy";
import {
  assertStreamSnapshot,
  prepareStreamReplacement,
  type Replacement,
  type ReplacementLedger,
  type StreamSnapshot,
} from "./stream-replacements";
const fields =
  "id,creator_id,stream_id,playback_id,is_live,save_recording,requires_metoken,metoken_price,updated_at";
export function channelMigrationEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    (process.env.VERCEL_ENV === "preview" &&
      url === "https://zxpobpucayevlrzdxhmr.supabase.co") ||
    (process.env.VERCEL_ENV === "production" &&
      url === "https://zdeiezfoemibjgrkyzvs.supabase.co")
  );
}
async function verifyTarget(record: Replacement) {
  const id = record.frameworks_stream_id ?? record.source_snapshot.stream_id;
  const expectedPlayback =
    record.frameworks_playback_id ?? record.source_snapshot.playback_id;
  const expectedKey = record.frameworks_stream_key ?? record.source_stream_key;
  const data = await frameworksGraphqlRequest<{
    stream: null | {
      id: string;
      playbackId: string;
      streamKey: string;
      record: boolean;
      playbackPolicy: null | {
        type: string;
        jwt: null | { allowedKids: string[]; requiredAudience: string[] };
      };
    };
  }>(
    "query VerifyReplacement($id:ID!){stream(id:$id){id playbackId streamKey record playbackPolicy{type jwt{allowedKids requiredAudience}}}}",
    { id },
  );
  const s = data.stream,
    kid = requireVodSigningKeyId();
  if (
    !s ||
    s.id !== id ||
    s.playbackId !== expectedPlayback ||
    s.streamKey !== expectedKey ||
    s.record !== (frameworksReplayEnabled() && record.source_snapshot.save_recording === true) ||
    s.playbackPolicy?.type !== "JWT" ||
    s.playbackPolicy.jwt?.allowedKids.length !== 1 ||
    s.playbackPolicy.jwt.allowedKids[0] !== kid ||
    s.playbackPolicy.jwt.requiredAudience.length !== 1 ||
    s.playbackPolicy.jwt.requiredAudience[0] !== expectedPlayback
  )
    throw new Error(
      "Provider channel configuration does not match its reservation",
    );
  return { streamId: s.id, playbackId: s.playbackId, streamKey: s.streamKey };
}
export async function prepareStoredStreamReplacement(
  db: SupabaseClient,
  snapshot: StreamSnapshot,
) {
  assertStreamSnapshot(snapshot);
  const ledger: ReplacementLedger = {
    async find(id) {
      const { data, error } = await db
        .from("frameworks_stream_replacements")
        .select("*")
        .eq("stream_row_id", id)
        .maybeSingle();
      if (error) throw new Error("Cannot read channel reservation");
      return data as Replacement | null;
    },
    async reserve(expected) {
      const { data: source, error } = await db
        .from("streams")
        .select(`${fields},stream_key,provider`)
        .eq("id", expected.id)
        .single();
      if (
        error ||
        !source ||
        (Object.keys(expected) as Array<keyof StreamSnapshot>).some(
          (key) => source[key] !== expected[key],
        ) ||
        !source.stream_key
      )
        throw new Error("Active channel differs from reviewed snapshot");
      const { data, error: insertError } = await db
        .from("frameworks_stream_replacements")
        .insert({
          stream_row_id: source.id,
          source_snapshot: expected,
          source_provider: source.provider,
          source_stream_key: source.stream_key,
          state: "prepared",
        })
        .select("*")
        .single();
      if (insertError?.code === "23505") {
        const existing = await ledger.find(expected.id);
        if (existing) return existing;
      }
      if (insertError || !data)
        throw new Error("Cannot reserve channel replacement");
      return data as Replacement;
    },
    async claim(id) {
      const { data, error } = await db
        .from("frameworks_stream_replacements")
        .update({ state: "creating", updated_at: new Date().toISOString() })
        .eq("stream_row_id", id)
        .eq("state", "prepared")
        .select("stream_row_id");
      if (error) throw new Error("Cannot claim channel reservation");
      return data?.length === 1;
    },
    async ready(id, target) {
      const { data, error } = await db
        .from("frameworks_stream_replacements")
        .update({
          state: "ready",
          frameworks_stream_id: target.streamId,
          frameworks_playback_id: target.playbackId,
          frameworks_stream_key: target.streamKey,
          updated_at: new Date().toISOString(),
        })
        .eq("stream_row_id", id)
        .eq("state", "creating")
        .select("stream_row_id");
      if (error || data?.length !== 1)
        throw new Error("Cannot persist channel replacement");
    },
    async ambiguous(id) {
      const { error } = await db
        .from("frameworks_stream_replacements")
        .update({ state: "ambiguous", updated_at: new Date().toISOString() })
        .eq("stream_row_id", id)
        .eq("state", "creating");
      if (error) throw new Error("Cannot persist uncertain channel state");
    },
  };
  const result = await prepareStreamReplacement({
    snapshot,
    ledger,
    verifyExisting: verifyTarget,
    create: async () => {
      requireVodSigningKeyId();
      const target = await frameworksStreams.create({
        name: `crtv-replacement-${snapshot.id}`,
        profiles: [],
        record: frameworksReplayEnabled() && snapshot.save_recording === true,
        playbackPolicy: { type: "jwt" },
        creatorId: snapshot.creator_id,
      });
      const saved = await db
        .from("frameworks_stream_replacements")
        .update({
          frameworks_stream_id: target.streamId,
          frameworks_playback_id: target.playbackId,
          frameworks_stream_key: target.streamKey,
          updated_at: new Date().toISOString(),
        })
        .eq("stream_row_id", snapshot.id)
        .eq("state", "creating")
        .select("stream_row_id");
      if (saved.error || saved.data?.length !== 1)
        throw new Error("Cannot persist created channel identity");
      // Read back the actual policy and recording setting before declaring this target ready.
      await verifyTarget({
        stream_row_id: snapshot.id,
        source_snapshot: snapshot,
        source_provider: null,
        source_stream_key: "",
        state: "creating",
        frameworks_stream_id: target.streamId,
        frameworks_playback_id: target.playbackId,
        frameworks_stream_key: target.streamKey,
      });
      return target;
    },
  });
  if (result.state === "ready") {
    const stored = await ledger.find(snapshot.id);
    if (!stored) throw new Error("Channel reservation unavailable");
    await verifyTarget(stored);
  }
  return result; // Public identities only. Ingest and rollback keys stay in the private ledger.
}
