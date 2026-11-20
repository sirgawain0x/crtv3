import { resolveVideoProviderId } from "./config";
import { frameworksGraphqlRequest } from "./frameworks-graphql";
import type { StreamIngestDestination } from "./ingest-types";

/**
 * Resolve the requested protocol without substituting a different transport.
 * @see https://github.com/Livepeer-FrameWorks/monorepo/blob/11c40d55ac8ede27df0ceb10d62048c0dd4010e9/pkg/graphql/public/schema.public.graphql
 */
export async function resolveStreamIngest(
  streamKey: string,
  protocol: "WHIP" | "RTMP",
): Promise<StreamIngestDestination> {
  const provider = resolveVideoProviderId();
  if (provider === "livepeer") {
    return protocol === "WHIP"
      ? { provider, whipUrl: `https://playback.livepeer.studio/webrtc/${encodeURIComponent(streamKey)}` }
      : { provider, rtmpUrl: `rtmp://rtmp.livepeer.studio/live/${encodeURIComponent(streamKey)}` };
  }
  const result = await frameworksGraphqlRequest<{
    resolveIngestEndpoint: { primary: { whipUrl?: string | null; rtmpUrl?: string | null } } | null;
  }>(`query CreativeTvIngest($streamKey: String!, $protocol: MediaIngestProtocol!) {
    resolveIngestEndpoint(streamKey: $streamKey, protocol: $protocol) {
      primary { whipUrl rtmpUrl }
    }
  }`, { streamKey, protocol });
  const value = protocol === "WHIP"
    ? result.resolveIngestEndpoint?.primary?.whipUrl
    : result.resolveIngestEndpoint?.primary?.rtmpUrl;
  if (!value) throw new Error("Requested ingest protocol is unavailable");
  const url = new URL(value);
  const schemes = protocol === "WHIP" ? ["https:"] : ["rtmp:", "rtmps:"];
  if (!schemes.includes(url.protocol) || !url.hostname || url.username || url.password || url.hash) {
    throw new Error("Invalid ingest destination");
  }
  return protocol === "WHIP" ? { provider, whipUrl: value } : { provider, rtmpUrl: value };
}
