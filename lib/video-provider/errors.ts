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
