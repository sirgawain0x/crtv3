import { resolveVideoProviderId } from "./config";

/** Raised when upload/asset APIs are invoked while `VIDEO_PROVIDER=frameworks` (#406). */
export class FrameWorksUploadsAssetsUnavailableError extends Error {
  readonly code = "FRAMEWORKS_UPLOADS_ASSETS_UNAVAILABLE" as const;

  constructor() {
    super("FrameWorks uploads/assets not available yet (#406)");
    this.name = "FrameWorksUploadsAssetsUnavailableError";
  }
}

/** No-op after #406 wires FrameWorks assets (VOD upload/import/CRUD). */
export function assertUploadsAndAssetsAvailable(_operation: string): void {
  if (resolveVideoProviderId() !== "frameworks") {
    return;
  }
}
