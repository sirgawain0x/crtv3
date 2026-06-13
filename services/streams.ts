"use server";

import { createClient } from "../lib/sdk/supabase/server";
import { createServiceClient } from "../lib/sdk/supabase/service";
import {
  verifyWalletAuthArgs,
  WalletAuthError,
  type WalletAuthArgs,
} from "../lib/auth/require-wallet";

export interface Stream {
    id: string;
    creator_id: string;
    stream_key: string;
    stream_id: string;
    playback_id: string;
    thumbnail_url?: string | null;
    name?: string | null;
    is_live: boolean;
    last_live_at?: string | null;
    allow_clipping?: boolean;
    story_ip_id?: string | null;
    story_license_terms_id?: string | null;
    story_ip_registration_tx?: string | null;
    story_ip_registered_at?: string | null;
    story_commercial_rev_share?: number | null;
    requires_metoken?: boolean;
    metoken_price?: number | null;
    created_at: string;
    updated_at: string;
}

export type CreateStreamParams = Omit<Stream, "id" | "created_at" | "updated_at">;
export type UpdateStreamParams = Partial<Omit<Stream, "id" | "creator_id" | "created_at">>;
export type PublicStream = Omit<Stream, "stream_key">;

async function assertStreamOwner(
    creatorId: string,
    auth: WalletAuthArgs | undefined,
): Promise<string> {
    const { address } = await verifyWalletAuthArgs(auth);
    const normalizedCreatorId = creatorId.toLowerCase();
    if (address !== normalizedCreatorId) {
        throw new WalletAuthError(
            403,
            "Authenticated address does not match the stream owner",
        );
    }
    return address;
}

function redactStreamKey(stream: Stream): PublicStream {
    const { stream_key: _streamKey, ...publicStream } = stream;
    return publicStream;
}

/**
 * Get a stream by creator ID (wallet address).
 * `stream_key` is only returned when wallet auth proves ownership of `creatorId`.
 */
export async function getStreamByCreator(
    creatorId: string,
    auth?: WalletAuthArgs,
): Promise<Stream | PublicStream | null> {
    const supabase = await createServiceClient(); // Use service client to bypass RLS initially or ensure reliable fetch

    // Normalize creator ID
    const normalizedCreatorId = creatorId.toLowerCase();

    const { data, error } = await supabase
        .from("streams")
        .select("*")
        .ilike("creator_id", normalizedCreatorId) // Case-insensitive match
        .maybeSingle();

    if (error) {
        console.error("Error fetching stream by creator:", error);
        throw new Error(`Failed to fetch stream: ${error.message}`);
    }

    if (!data) {
        return null;
    }

    const stream = data as Stream;

    if (auth) {
        try {
            const verified = await verifyWalletAuthArgs(auth);
            if (verified.address === normalizedCreatorId) {
                return stream;
            }
        } catch {
            // Fall through to redacted response for invalid or mismatched auth.
        }
    }

    return redactStreamKey(stream);
}

/**
 * Get a stream by Livepeer stream ID
 */
export async function getStreamByStreamId(streamId: string) {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
        .from("streams")
        .select("*")
        .eq("stream_id", streamId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching stream by stream ID:", error);
        throw new Error(`Failed to fetch stream: ${error.message}`);
    }

    return data as Stream | null;
}

/**
 * Get a stream by playback ID
 */
export async function getStreamByPlaybackId(playbackId: string) {
    const supabase = await createClient(); // Use regular client for public read

    const { data, error } = await supabase
        .from("streams")
        .select("id, creator_id, playback_id, thumbnail_url, name, is_live, last_live_at, allow_clipping, requires_metoken, metoken_price, story_ip_id, story_license_terms_id, story_commercial_rev_share, story_ip_registered_at")
        .eq("playback_id", playbackId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching stream by playback ID:", error);
        throw new Error(`Failed to fetch stream: ${error.message}`);
    }

    return data as Partial<Stream> | null;
}

/**
 * Create a new persistent stream record
 */
export async function createStreamRecord(params: CreateStreamParams) {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
        .from("streams")
        .insert({
            ...params,
            creator_id: params.creator_id.toLowerCase(), // Ensure lowercase storage
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating stream record:", error);
        throw new Error(`Failed to create stream record: ${error.message}`);
    }

    return data as Stream;
}

/**
 * Update an existing stream record. Requires wallet auth proving `creatorId`.
 */
export async function updateStream(
    creatorId: string,
    updates: UpdateStreamParams,
    auth: WalletAuthArgs,
) {
    await assertStreamOwner(creatorId, auth);

    const supabase = await createServiceClient();

    const { data, error } = await supabase
        .from("streams")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .ilike("creator_id", creatorId)
        .select()
        .single();

    if (error) {
        console.error("Error updating stream record:", error);
        throw new Error(`Failed to update stream: ${error.message}`);
    }

    return data as Stream;
}

/**
 * Record Story Protocol IP registration for a stream
 */
export async function updateStreamStoryIp(
    creatorId: string,
    storyData: {
        story_ip_id: string;
        story_license_terms_id?: string | null;
        story_ip_registration_tx: string;
        story_commercial_rev_share?: number | null;
    }
) {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
        .from("streams")
        .update({
            story_ip_id: storyData.story_ip_id,
            story_license_terms_id: storyData.story_license_terms_id ?? null,
            story_ip_registration_tx: storyData.story_ip_registration_tx,
            story_ip_registered_at: new Date().toISOString(),
            story_commercial_rev_share: storyData.story_commercial_rev_share ?? null,
            updated_at: new Date().toISOString(),
        })
        .ilike("creator_id", creatorId)
        .select()
        .single();

    if (error) {
        console.error("Error updating stream Story IP status:", error);
        throw new Error(`Failed to update stream Story IP: ${error.message}`);
    }

    return data as Stream;
}

export interface ActiveStream {
    id: string;
    creator_id: string;
    playback_id: string;
    thumbnail_url?: string | null;
    name?: string | null;
    is_live: boolean;
    last_live_at?: string | null;
    requires_metoken?: boolean;
    created_at: string;
}

/**
 * Get all active streams from the database
 */
export async function getActiveStreams() {
    const supabase = await createClient(); // Use regular client for public read

    const { data, error } = await supabase
        .from("streams")
        .select("id, creator_id, playback_id, thumbnail_url, name, is_live, last_live_at, requires_metoken, created_at")
        .eq("is_live", true)
        .order("last_live_at", { ascending: false });

    if (error) {
        console.error("Error fetching active streams:", error);
        // Return empty array instead of throwing to avoid breaking UI
        return [];
    }

    return data as ActiveStream[];
}
