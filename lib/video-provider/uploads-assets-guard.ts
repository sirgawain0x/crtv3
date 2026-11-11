import { serverLogger } from "@/lib/utils/logger";
import { resolveVideoProviderId } from "./config";

/** Raised when upload/asset APIs are invoked while `VIDEO_PROVIDER=frameworks` (#406). */
export class FrameWorksUploadsAssetsUnavailableError extends Error {
  readonly code = "FRAMEWORKS_UPLOADS_ASSETS_UNAVAILABLE" as const;

  constructor() {
    super("FrameWorks uploads/assets not available yet (#406)");
    this.name = "FrameWorksUploadsAssetsUnavailableError";
  }
}

export function assertUploadsAndAssetsAvailable(operation: string): void {
  if (resolveVideoProviderId() !== "frameworks") {
    return;
  }
  serverLogger.warn(
    "[video-provider] Refusing upload/asset operation in frameworks mode",
    {
      operation,
      videoProvider: "frameworks",
      reason:
        "Uploads and VOD assets are not wired for FrameWorks in this PR; blocked until #406.",
    },
  );
  throw new FrameWorksUploadsAssetsUnavailableError();
}
