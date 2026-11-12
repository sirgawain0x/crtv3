import { resolveVideoProviderId } from "./config";

/** Raised when stream creation is invoked while `VIDEO_PROVIDER=frameworks` (#404). */
export class FrameWorksStreamsCreateUnavailableError extends Error {
  readonly code = "FRAMEWORKS_STREAMS_CREATE_UNAVAILABLE" as const;

  constructor() {
    super("FrameWorks stream creation not available yet (#404)");
    this.name = "FrameWorksStreamsCreateUnavailableError";
  }
}

/** No-op after #404 wires FrameWorks `streams.create` (playbackPolicy + streamKey). */
export function assertStreamCreationAvailable(_operation: string): void {
  if (resolveVideoProviderId() !== "frameworks") {
    return;
  }
}
