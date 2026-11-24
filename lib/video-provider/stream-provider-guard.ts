import type { VideoProviderId } from "./config";

export class StreamProviderMigrationRequiredError extends Error {
  constructor() {
    super("This channel needs a streaming migration before it can go live. Its saved credentials have not been changed.");
    this.name = "StreamProviderMigrationRequiredError";
  }
}

/**
 * Until rows carry provider provenance, never treat a cross-provider lookup
 * miss as a deleted stream and automatically replace its saved credentials.
 * FrameWorks uses canonical base64("Stream:<uuid>") GraphQL node IDs;
 * legacy Livepeer stream IDs are not typed GraphQL node IDs.
 */
export function assertStreamProviderCompatibility(
  provider: VideoProviderId,
  existing: { stream_id?: string | null } | null,
) {
  if (!existing) return;
  const id = existing.stream_id ?? "";
  const decoded = Buffer.from(id, "base64").toString("utf8");
  const canonical = Buffer.from(decoded, "utf8").toString("base64") === id;
  const typedNode = canonical && /^[A-Za-z][A-Za-z0-9]*:/.test(decoded);
  const streamNode = canonical && decoded.startsWith("Stream:") && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded.slice("Stream:".length));
  if ((provider === "frameworks" && !streamNode) || (provider === "livepeer" && typedNode)) {
    throw new StreamProviderMigrationRequiredError();
  }
}
