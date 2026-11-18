export class VideoProviderNotImplementedError extends Error {
  readonly code = "VIDEO_PROVIDER_NOT_IMPLEMENTED" as const;
  readonly provider: "livepeer" | "frameworks";
  readonly operation: string;

  constructor(provider: "livepeer" | "frameworks", operation: string) {
    super(
      `FrameWorks video provider: ${operation} is not implemented yet (stub for follow-up PRs).`,
    );
    this.name = "VideoProviderNotImplementedError";
    this.provider = provider;
    this.operation = operation;
  }
}

export type FrameworksPlaybackSigningFailureReason =
  | "invalid_playback_id"
  | "signing_unavailable";

export class FrameworksPlaybackSigningError extends Error {
  readonly code = "FRAMEWORKS_PLAYBACK_SIGNING_FAILED" as const;
  readonly reason: FrameworksPlaybackSigningFailureReason;

  constructor(reason: FrameworksPlaybackSigningFailureReason) {
    super(
      reason === "invalid_playback_id"
        ? "Authorized playback URL requires a non-empty playback ID"
        : "Authorized playback URL requires configured viewer JWT signing",
    );
    this.name = "FrameworksPlaybackSigningError";
    this.reason = reason;
  }
}

export class VideoProviderNotConfiguredError extends Error {
  readonly code = "VIDEO_PROVIDER_NOT_CONFIGURED" as const;

  constructor(provider: "livepeer" | "frameworks") {
    super(
      provider === "livepeer"
        ? "LIVEPEER_NOT_CONFIGURED"
        : "FRAMEWORKS_NOT_CONFIGURED",
    );
    this.name = "VideoProviderNotConfiguredError";
  }
}
