import {
  createLivepeerStream,
  getLivepeerStreamOrNull,
  type CreateLivepeerStreamParams,
} from "@/lib/livepeer/studio-api";
import { hasLivepeerPrivateApiKey } from "@/lib/sdk/livepeer/studioAuth";
import { serverLogger } from "@/lib/utils/logger";
import {
  createStreamRecord,
  replaceStreamLivepeerCredentials,
  type Stream,
} from "@/services/streams";

export type StreamCredentials = {
  streamId: string;
  playbackId: string;
  streamKey: string;
};

export type EnsureLivepeerStreamResult = StreamCredentials & {
  /** True when an existing Supabase row was kept and Livepeer still had the stream. */
  reused: boolean;
  /** True when Livepeer stream was missing (or force-replaced) and credentials were recreated. */
  replaced: boolean;
  /** True when DB credentials were updated from a still-living Studio stream. */
  synced: boolean;
};

export type EnsureLivepeerStreamOptions = {
  creatorId: string;
  name: string;
  profiles: CreateLivepeerStreamParams["profiles"];
  record: boolean;
  playbackPolicy: Record<string, unknown>;
  /** Existing Supabase stream row, if any. */
  existing: Stream | null;
  /**
   * When true and a DB row exists, always recreate the Livepeer stream and
   * replace Supabase credentials (used after WHIP 404 with an unchanged key).
   */
  forceReplace?: boolean;
};

const DEFAULT_PROFILES: CreateLivepeerStreamParams["profiles"] = [
  {
    name: "480p",
    width: 854,
    height: 480,
    bitrate: 1_000_000,
    fps: 30,
    fpsDen: 1,
    quality: 23,
    gop: "2",
    profile: "H264Baseline",
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    bitrate: 2_500_000,
    fps: 30,
    fpsDen: 1,
    quality: 23,
    gop: "2",
    profile: "H264Baseline",
  },
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    bitrate: 4_500_000,
    fps: 30,
    fpsDen: 1,
    quality: 23,
    gop: "2",
    profile: "H264Baseline",
  },
];

export function defaultStreamCreateOptions(creatorId: string): Omit<
  EnsureLivepeerStreamOptions,
  "existing"
> {
  const normalized = creatorId.toLowerCase();
  return {
    creatorId: normalized,
    name: `Broadcast-${Date.now()}`,
    profiles: DEFAULT_PROFILES,
    record: true,
    playbackPolicy: { type: "jwt" },
  };
}

async function recreateLivepeerCredentials(
  creatorId: string,
  options: EnsureLivepeerStreamOptions,
  existing: Stream | null,
  reason: string,
): Promise<EnsureLivepeerStreamResult> {
  serverLogger.warn("[ensureLivepeerStream] Recreating Livepeer stream", {
    creatorId,
    reason,
    staleStreamId: existing?.stream_id,
  });

  const created = await createLivepeerStream({
    name: options.name || existing?.name || `Broadcast-${Date.now()}`,
    profiles: options.profiles,
    record: options.record,
    playbackPolicy: options.playbackPolicy,
    creatorId,
  });

  await replaceStreamLivepeerCredentials(creatorId, {
    stream_id: created.streamId,
    stream_key: created.streamKey,
    playback_id: created.playbackId,
  });

  return {
    streamId: created.streamId,
    playbackId: created.playbackId,
    streamKey: created.streamKey,
    reused: false,
    replaced: true,
    synced: false,
  };
}

/**
 * Ensure the creator has a Livepeer stream that still exists in Studio.
 * - No DB row → create Livepeer + Supabase row
 * - DB row + Livepeer alive + matching key → reuse credentials
 * - DB row + Livepeer alive + mismatched key/playback → sync from Studio
 * - DB row + Livepeer alive but no usable key → recreate
 * - DB row + Livepeer missing → recreate Livepeer and replace Supabase credentials
 * - forceReplace → always recreate
 */
export async function ensureLivepeerStreamForCreator(
  options: EnsureLivepeerStreamOptions,
): Promise<EnsureLivepeerStreamResult> {
  if (!hasLivepeerPrivateApiKey()) {
    throw new Error("MISSING_API_KEY");
  }

  const creatorId = options.creatorId.toLowerCase();
  const existing = options.existing;

  if (existing?.stream_id) {
    if (options.forceReplace) {
      return recreateLivepeerCredentials(
        creatorId,
        options,
        existing,
        "forceReplace",
      );
    }

    const live = await getLivepeerStreamOrNull(existing.stream_id);
    if (live) {
      const studioKey = live.streamKey?.trim();
      if (!studioKey) {
        return recreateLivepeerCredentials(
          creatorId,
          options,
          existing,
          "studio_missing_stream_key",
        );
      }

      const studioPlaybackId = live.playbackId?.trim() || existing.playback_id;
      const keyMismatch = studioKey !== existing.stream_key;
      const playbackMismatch =
        Boolean(live.playbackId?.trim()) &&
        live.playbackId !== existing.playback_id;

      if (keyMismatch || playbackMismatch) {
        serverLogger.info(
          "[ensureLivepeerStream] Syncing credentials from Studio",
          {
            creatorId,
            streamId: existing.stream_id,
            keyMismatch,
            playbackMismatch,
          },
        );

        await replaceStreamLivepeerCredentials(creatorId, {
          stream_id: existing.stream_id,
          stream_key: studioKey,
          playback_id: studioPlaybackId,
        });

        return {
          streamId: existing.stream_id,
          playbackId: studioPlaybackId,
          streamKey: studioKey,
          reused: false,
          replaced: false,
          synced: true,
        };
      }

      return {
        streamId: existing.stream_id,
        playbackId: existing.playback_id,
        streamKey: existing.stream_key,
        reused: true,
        replaced: false,
        synced: false,
      };
    }

    return recreateLivepeerCredentials(
      creatorId,
      options,
      existing,
      "livepeer_stream_missing",
    );
  }

  const created = await createLivepeerStream({
    name: options.name,
    profiles: options.profiles,
    record: options.record,
    playbackPolicy: options.playbackPolicy,
    creatorId,
  });

  await createStreamRecord({
    creator_id: creatorId,
    stream_key: created.streamKey,
    stream_id: created.streamId,
    playback_id: created.playbackId,
    name: options.name || `Channel-${creatorId.slice(0, 6)}`,
    is_live: false,
    save_recording: options.record,
  });

  return {
    streamId: created.streamId,
    playbackId: created.playbackId,
    streamKey: created.streamKey,
    reused: false,
    replaced: false,
    synced: false,
  };
}
