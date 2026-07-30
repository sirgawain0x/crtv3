/**
 * Server-only atomic upserts for event submissions.
 * Uses the service-role client (bypasses RLS). Call only after
 * `requireWalletAuthFor` has verified the wallet owns the request.
 */

import { createServiceClient } from "@/lib/sdk/supabase/service";
import type { HackBetaSubmission } from "@/lib/sdk/supabase/hack-beta-submissions";
import type { SongCupSubmission } from "@/lib/sdk/supabase/song-cup-submissions";
import { serverLogger } from "@/lib/utils/logger";

export type HackBetaUpsertInput = {
  wallet_address: string;
  video_asset_id: string;
  title?: string | null;
  description?: string | null;
  playback_id?: string | null;
  thumbnail_url?: string | null;
  grove_url?: string | null;
  grove_hash?: string | null;
};

export type SongCupUpsertInput = {
  wallet_address: string;
  grove_url: string;
  grove_hash?: string | null;
  title?: string | null;
  description?: string | null;
  artist_handle?: string | null;
  email?: string | null;
  cover_url?: string | null;
  cover_hash?: string | null;
  attestation_uid?: string | null;
  post_id?: string | null;
};

export async function upsertHackBetaSubmission(
  input: HackBetaUpsertInput,
): Promise<HackBetaSubmission> {
  const supabase = createServiceClient();
  const wallet = input.wallet_address.toLowerCase();

  const { data: updated, error: updateError } = await supabase
    .from("hack_beta_submissions")
    .update({
      video_asset_id: input.video_asset_id,
      title: input.title ?? null,
      description: input.description ?? null,
      playback_id: input.playback_id ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      grove_url: input.grove_url ?? null,
      grove_hash: input.grove_hash ?? null,
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .ilike("wallet_address", wallet)
    .select("*")
    .maybeSingle();

  if (updateError) {
    serverLogger.error("[submission-upserts] hack-beta update error:", updateError);
    throw new Error(updateError.message);
  }
  if (updated) return updated as HackBetaSubmission;

  const { data: inserted, error: insertError } = await supabase
    .from("hack_beta_submissions")
    .insert({
      wallet_address: wallet,
      video_asset_id: input.video_asset_id,
      title: input.title ?? null,
      description: input.description ?? null,
      playback_id: input.playback_id ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      grove_url: input.grove_url ?? null,
      grove_hash: input.grove_hash ?? null,
      status: "pending",
      is_favorite: false,
    })
    .select("*")
    .single();

  if (insertError) {
    // Concurrent insert race: unique on lower(wallet) — fetch the row and update.
    if (insertError.code === "23505") {
      const { data: raced, error: raceError } = await supabase
        .from("hack_beta_submissions")
        .update({
          video_asset_id: input.video_asset_id,
          title: input.title ?? null,
          description: input.description ?? null,
          playback_id: input.playback_id ?? null,
          thumbnail_url: input.thumbnail_url ?? null,
          grove_url: input.grove_url ?? null,
          grove_hash: input.grove_hash ?? null,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .ilike("wallet_address", wallet)
        .select("*")
        .single();
      if (raceError || !raced) {
        serverLogger.error("[submission-upserts] hack-beta race update error:", raceError);
        throw new Error(raceError?.message ?? "Failed to upsert hack beta submission");
      }
      return raced as HackBetaSubmission;
    }
    serverLogger.error("[submission-upserts] hack-beta insert error:", insertError);
    throw new Error(insertError.message);
  }

  return inserted as HackBetaSubmission;
}

export async function upsertSongCupSubmission(
  input: SongCupUpsertInput,
): Promise<SongCupSubmission> {
  const supabase = createServiceClient();
  const wallet = input.wallet_address.toLowerCase();

  const { data: updated, error: updateError } = await supabase
    .from("song_cup_submissions")
    .update({
      grove_url: input.grove_url,
      grove_hash: input.grove_hash ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      artist_handle: input.artist_handle ?? null,
      email: input.email ?? null,
      cover_url: input.cover_url ?? null,
      cover_hash: input.cover_hash ?? null,
      attestation_uid: input.attestation_uid ?? null,
      post_id: input.post_id ?? null,
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .ilike("wallet_address", wallet)
    .select("*")
    .maybeSingle();

  if (updateError) {
    serverLogger.error("[submission-upserts] song-cup update error:", updateError);
    throw new Error(updateError.message);
  }
  if (updated) return updated as SongCupSubmission;

  const { data: inserted, error: insertError } = await supabase
    .from("song_cup_submissions")
    .insert({
      wallet_address: wallet,
      grove_url: input.grove_url,
      grove_hash: input.grove_hash ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      artist_handle: input.artist_handle ?? null,
      email: input.email ?? null,
      cover_url: input.cover_url ?? null,
      cover_hash: input.cover_hash ?? null,
      attestation_uid: input.attestation_uid ?? null,
      post_id: input.post_id ?? null,
      status: "pending",
      is_favorite: false,
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced, error: raceError } = await supabase
        .from("song_cup_submissions")
        .update({
          grove_url: input.grove_url,
          grove_hash: input.grove_hash ?? null,
          title: input.title ?? null,
          description: input.description ?? null,
          artist_handle: input.artist_handle ?? null,
          email: input.email ?? null,
          cover_url: input.cover_url ?? null,
          cover_hash: input.cover_hash ?? null,
          attestation_uid: input.attestation_uid ?? null,
          post_id: input.post_id ?? null,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .ilike("wallet_address", wallet)
        .select("*")
        .single();
      if (raceError || !raced) {
        serverLogger.error("[submission-upserts] song-cup race update error:", raceError);
        throw new Error(raceError?.message ?? "Failed to upsert song cup submission");
      }
      return raced as SongCupSubmission;
    }
    serverLogger.error("[submission-upserts] song-cup insert error:", insertError);
    throw new Error(insertError.message);
  }

  return inserted as SongCupSubmission;
}
