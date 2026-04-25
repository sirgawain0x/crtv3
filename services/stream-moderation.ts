"use server";

import { createClient } from "../lib/sdk/supabase/server";
import { createServiceClient } from "../lib/sdk/supabase/service";

export interface ModerationState {
  hiddenIds: string[];
  bannedAddresses: string[];
  moderators: string[];
  creatorAddress: string | null;
}

async function isAuthorizedModerator(
  streamId: string,
  callerAddress: string
): Promise<{ ok: boolean; reason?: string }> {
  const normalizedCaller = callerAddress.toLowerCase();
  const supabase = await createServiceClient();

  const { data: stream, error: streamErr } = await supabase
    .from("streams")
    .select("creator_id")
    .eq("playback_id", streamId)
    .maybeSingle();

  if (streamErr) {
    return { ok: false, reason: `Failed to look up stream: ${streamErr.message}` };
  }
  if (!stream) {
    return { ok: false, reason: "Stream not found" };
  }

  if ((stream.creator_id as string).toLowerCase() === normalizedCaller) {
    return { ok: true };
  }

  const { data: mod, error: modErr } = await supabase
    .from("stream_moderation_moderators")
    .select("moderator_address")
    .eq("stream_id", streamId)
    .eq("moderator_address", normalizedCaller)
    .maybeSingle();

  if (modErr) {
    return { ok: false, reason: `Failed to verify moderator: ${modErr.message}` };
  }
  if (mod) {
    return { ok: true };
  }

  return { ok: false, reason: "Not authorized" };
}

async function isStreamCreator(
  streamId: string,
  callerAddress: string
): Promise<{ ok: boolean; reason?: string }> {
  const normalizedCaller = callerAddress.toLowerCase();
  const supabase = await createServiceClient();

  const { data: stream, error } = await supabase
    .from("streams")
    .select("creator_id")
    .eq("playback_id", streamId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: `Failed to look up stream: ${error.message}` };
  }
  if (!stream) {
    return { ok: false, reason: "Stream not found" };
  }
  if ((stream.creator_id as string).toLowerCase() !== normalizedCaller) {
    return { ok: false, reason: "Only the stream creator can do this" };
  }
  return { ok: true };
}

export async function getModerationState(streamId: string): Promise<ModerationState> {
  const supabase = await createClient();

  const [hiddenRes, bansRes, modsRes, streamRes] = await Promise.all([
    supabase
      .from("stream_moderation_hidden_messages")
      .select("message_id")
      .eq("stream_id", streamId),
    supabase
      .from("stream_moderation_bans")
      .select("banned_address")
      .eq("stream_id", streamId),
    supabase
      .from("stream_moderation_moderators")
      .select("moderator_address")
      .eq("stream_id", streamId),
    supabase
      .from("streams")
      .select("creator_id")
      .eq("playback_id", streamId)
      .maybeSingle(),
  ]);

  return {
    hiddenIds: (hiddenRes.data ?? []).map((r) => r.message_id as string),
    bannedAddresses: (bansRes.data ?? []).map((r) =>
      (r.banned_address as string).toLowerCase()
    ),
    moderators: (modsRes.data ?? []).map((r) =>
      (r.moderator_address as string).toLowerCase()
    ),
    creatorAddress: streamRes.data?.creator_id
      ? (streamRes.data.creator_id as string).toLowerCase()
      : null,
  };
}

export async function hideMessage(
  streamId: string,
  messageId: string,
  callerAddress: string
) {
  const auth = await isAuthorizedModerator(streamId, callerAddress);
  if (!auth.ok) throw new Error(auth.reason ?? "Not authorized");

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("stream_moderation_hidden_messages")
    .upsert(
      {
        stream_id: streamId,
        message_id: messageId,
        hidden_by: callerAddress.toLowerCase(),
      },
      { onConflict: "stream_id,message_id" }
    );

  if (error) {
    throw new Error(`Failed to hide message: ${error.message}`);
  }
}

export async function unhideMessage(
  streamId: string,
  messageId: string,
  callerAddress: string
) {
  const auth = await isAuthorizedModerator(streamId, callerAddress);
  if (!auth.ok) throw new Error(auth.reason ?? "Not authorized");

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("stream_moderation_hidden_messages")
    .delete()
    .eq("stream_id", streamId)
    .eq("message_id", messageId);

  if (error) {
    throw new Error(`Failed to unhide message: ${error.message}`);
  }
}

export async function banUser(
  streamId: string,
  bannedAddress: string,
  callerAddress: string
) {
  const auth = await isAuthorizedModerator(streamId, callerAddress);
  if (!auth.ok) throw new Error(auth.reason ?? "Not authorized");

  const supabase = await createServiceClient();
  const { error } = await supabase.from("stream_moderation_bans").upsert(
    {
      stream_id: streamId,
      banned_address: bannedAddress.toLowerCase(),
      banned_by: callerAddress.toLowerCase(),
    },
    { onConflict: "stream_id,banned_address" }
  );

  if (error) {
    throw new Error(`Failed to ban user: ${error.message}`);
  }
}

export async function unbanUser(
  streamId: string,
  bannedAddress: string,
  callerAddress: string
) {
  const auth = await isAuthorizedModerator(streamId, callerAddress);
  if (!auth.ok) throw new Error(auth.reason ?? "Not authorized");

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("stream_moderation_bans")
    .delete()
    .eq("stream_id", streamId)
    .eq("banned_address", bannedAddress.toLowerCase());

  if (error) {
    throw new Error(`Failed to unban user: ${error.message}`);
  }
}

// Appointing/removing moderators is creator-only — moderators can't appoint other moderators.
export async function addModerator(
  streamId: string,
  moderatorAddress: string,
  callerAddress: string
) {
  const auth = await isStreamCreator(streamId, callerAddress);
  if (!auth.ok) throw new Error(auth.reason ?? "Not authorized");

  const supabase = await createServiceClient();
  const { error } = await supabase.from("stream_moderation_moderators").upsert(
    {
      stream_id: streamId,
      moderator_address: moderatorAddress.toLowerCase(),
      appointed_by: callerAddress.toLowerCase(),
    },
    { onConflict: "stream_id,moderator_address" }
  );

  if (error) {
    throw new Error(`Failed to add moderator: ${error.message}`);
  }
}

export async function removeModerator(
  streamId: string,
  moderatorAddress: string,
  callerAddress: string
) {
  const auth = await isStreamCreator(streamId, callerAddress);
  if (!auth.ok) throw new Error(auth.reason ?? "Not authorized");

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("stream_moderation_moderators")
    .delete()
    .eq("stream_id", streamId)
    .eq("moderator_address", moderatorAddress.toLowerCase());

  if (error) {
    throw new Error(`Failed to remove moderator: ${error.message}`);
  }
}
