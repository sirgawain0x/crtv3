import { serverLogger } from "@/lib/utils/logger";
import { resolveVideoProviderId } from "./config";

/** Raised when stream creation is invoked while `VIDEO_PROVIDER=frameworks` (#404). */
export class FrameWorksStreamsCreateUnavailableError extends Error {
  readonly code = "FRAMEWORKS_STREAMS_CREATE_UNAVAILABLE" as const;

  constructor() {
    super("FrameWorks stream creation not available yet (#404)");
    this.name = "FrameWorksStreamsCreateUnavailableError";
  }
}

export function assertStreamCreationAvailable(operation: string): void {
  if (resolveVideoProviderId() !== "frameworks") {
    return;
  }
  serverLogger.warn(
    "[video-provider] Refusing stream creation in frameworks mode",
    {
      operation,
      videoProvider: "frameworks",
      reason:
        "Stream create with playbackPolicy/streamKey is not wired for FrameWorks in this PR; blocked until #404.",
    },
  );
  throw new FrameWorksStreamsCreateUnavailableError();
}
