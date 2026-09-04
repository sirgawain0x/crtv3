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
  /** True when Livepeer stream was missing and credentials were recreated. */
  replaced: boolean;
};

export type EnsureLivepeerStreamOptions = {
  creatorId: string;
  name: string;
  profiles: CreateLivepeerStreamParams["profiles"];
  record: boolean;
  playbackPolicy: Record<string, unknown>;
  /** Existing Supabase stream row, if any. */
  existing: Stream | null;
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

/**
 * Ensure the creator has a Livepeer stream that still exists in Studio.
 * - No DB row → create Livepeer + Supabase row
 * - DB row + Livepeer alive → reuse credentials
 * - DB row + Livepeer missing → recreate Livepeer and replace Supabase credentials
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
    const live = await getLivepeerStreamOrNull(existing.stream_id);
    if (live) {
      return {
        streamId: existing.stream_id,
        playbackId: existing.playback_id,
        streamKey: existing.stream_key,
        reused: true,
        replaced: false,
      };
    }

    serverLogger.warn("[ensureLivepeerStream] Livepeer stream missing; recreating", {
      creatorId,
      staleStreamId: existing.stream_id,
    });

    const created = await createLivepeerStream({
      name: options.name || existing.name || `Broadcast-${Date.now()}`,
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
    };
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
  };
}
