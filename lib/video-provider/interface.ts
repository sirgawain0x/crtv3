import type { Livepeer } from "livepeer";
import type {
  AssetSummary,
  CreateClipParams,
  CreateClipResult,
  CreateStreamParams,
  CreatedStream,
  PlaybackInfoResult,
  StreamSession,
  StreamSummary,
} from "./types";

/**
 * Thin video backend abstraction for Livepeer Studio (legacy) and FrameWorks.
 *
 * Surface area is intentionally broad so follow-up issues can plug in without
 * reshaping this layer:
 * - #404 livestreams — streams.*
 * - #405 playback — playback.*, signing (future)
 * - #406 uploads/assets/webhooks — assets.*, webhookSecret
 * - #408 AI cutover — ai.*
 */
export interface VideoProvider {
  readonly id: "livepeer" | "frameworks";

  isConfigured(): boolean;
  /** Private / full-access key for view metrics (Livepeer: LIVEPEER_FULL_API_KEY). */
  hasPrivateMetricsKey(): boolean;
  apiBaseUrl(): string;
  resolveAuthToken(): string | undefined;

  /** Livepeer SDK client when supported; null when not configured or not Livepeer. */
  getLivepeerSdkClient(): Livepeer | null;

  streams: {
    getOrNull(streamId: string): Promise<StreamSummary | null>;
    create(params: CreateStreamParams): Promise<CreatedStream>;
    setRecording(streamId: string, record: boolean): Promise<void>;
    getSessions(
      streamId: string,
      options?: { record?: boolean },
    ): Promise<StreamSession[]>;
    /** #404 — multistream targets on a stream. */
    getWithMultistream(streamId: string): Promise<unknown>;
    addMultistreamTarget(spec: unknown, streamId: string): Promise<unknown>;
    createClip(params: CreateClipParams): Promise<CreateClipResult>;
  };

  assets: {
    get(assetId: string): Promise<AssetSummary | null>;
    listRecentRecordings(limit?: number): Promise<AssetSummary[]>;
    getAll(): Promise<unknown>;
    getById(assetId: string): Promise<unknown>;
    create(body: unknown): Promise<unknown>;
    update(body: unknown, assetId: string): Promise<unknown>;
    createViaUrl(body: unknown): Promise<unknown>;
    delete(assetId: string): Promise<void>;
  };

  playback: {
    get(playbackId: string): Promise<PlaybackInfoResult>;
  };

  multistream: {
    delete(targetId: string): Promise<void>;
  };

  /** #408 — when false, UI/server paths must not call Livepeer AI after cutover. */
  ai: {
    isEnabled(): boolean;
    textToImage(params: unknown): Promise<unknown>;
  };

  /** #406 — webhook verification secret name differs by provider. */
  webhookSecretEnvKey(): string;
}
