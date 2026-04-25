"use server";

import { createServiceClient } from "../lib/sdk/supabase/service";

export interface ChatGroupRecord {
  group_id: string;
  stream_id: string;
  bot_invited_at: string | null;
  created_at: string;
}

/**
 * Upsert the XMTP groupId → streamId mapping the moderation worker uses
 * to resolve a conversation back to a moderation key. Idempotent.
 *
 * Called by the host's browser when it creates (or first encounters) a
 * chat group for a stream, after the bot has been invited.
 */
export async function registerChatGroup(
  streamId: string,
  groupId: string,
  botInvitedAt?: Date | null
): Promise<ChatGroupRecord> {
  if (!streamId || !groupId) {
    throw new Error("streamId and groupId are required");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stream_chat_groups")
    .upsert(
      {
        group_id: groupId,
        stream_id: streamId,
        bot_invited_at: botInvitedAt ? botInvitedAt.toISOString() : null,
      },
      { onConflict: "group_id" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register chat group: ${error.message}`);
  }
  return data as ChatGroupRecord;
}

export async function getChatGroupByGroupId(
  groupId: string
): Promise<ChatGroupRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stream_chat_groups")
    .select("group_id, stream_id, bot_invited_at, created_at")
    .eq("group_id", groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ChatGroupRecord) ?? null;
}
