import jwt from "jsonwebtoken";
import type { PlaybackInfoResult } from "../types";
import { frameworksGraphqlRequest } from "../frameworks-graphql";
import { frameworksPlayHlsUrl } from "./constants";

type ResolveViewerEndpointQuery = {
  resolveViewerEndpoint: {
    primary?: {
      url?: string;
      protocol?: string;
      baseUrl?: string;
      outputs?: Record<string, { protocol?: string; url?: string }>;
    } | null;
    fallbacks?: Array<{ url?: string; protocol?: string }>;
    metadata?: {
      status?: string;
      isLive?: boolean;
      title?: string;
      contentId?: string;
      contentType?: string;
    };
  } | null;
};

const RESOLVE_VIEWER_ENDPOINT = `
  query ResolveViewerEndpoint($contentId: String!) {
    resolveViewerEndpoint(contentId: $contentId) {
      primary {
        url
        protocol
        baseUrl
        outputs
      }
      fallbacks {
        url
        protocol
      }
      metadata {
        status
        isLive
        title
        contentId
        contentType
      }
    }
  }
`;

function pickHlsUrl(data: ResolveViewerEndpointQuery): string | undefined {
  const primary = data.resolveViewerEndpoint?.primary;
  if (primary?.outputs?.HLS?.url) return primary.outputs.HLS.url;
  if (primary?.url) return primary.url;
  const outputs = primary?.outputs;
  if (outputs) {
    for (const value of Object.values(outputs)) {
      if (value?.url) return value.url;
    }
  }
  return data.resolveViewerEndpoint?.fallbacks?.find((f) => f.url)?.url;
}

function toPlaybackInfo(playbackId: string, hlsUrl?: string): PlaybackInfoResult {
  const url = hlsUrl ?? frameworksPlayHlsUrl(playbackId);
  return {
    playbackInfo: {
      meta: {
        source: [
          {
            type: "application/x-mpegURL",
            url,
          },
        ],
      },
    },
  };
}

export type FrameworksPlaybackTokenOptions = {
  subject?: string;
  audience?: string | string[];
  expiresInSeconds?: number;
  claims?: Record<string, unknown>;
};

/** ES256 viewer JWT for gated playback (env: FRAMEWORKS_SIGNING_*). */
export function signFrameworksPlaybackToken(
  options: FrameworksPlaybackTokenOptions = {},
): string | null {
  const privateKey = process.env.FRAMEWORKS_SIGNING_PRIVATE_KEY?.trim();
  const kid = process.env.FRAMEWORKS_SIGNING_KID?.trim();
  if (!privateKey || !kid) return null;

  const expiresIn = options.expiresInSeconds ?? 300;
  const payload: jwt.JwtPayload = {
    sub: options.subject ?? "viewer",
    ...(options.claims ?? {}),
  };
  if (options.audience) {
    payload.aud = options.audience;
  }

  return jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    keyid: kid,
    expiresIn,
  });
}

export const frameworksPlayback = {
  get: async (playbackId: string): Promise<PlaybackInfoResult> => {
    const token = signFrameworksPlaybackToken({ expiresInSeconds: 300 });
    const headers: Record<string, string> | undefined = token
      ? { "X-Frameworks-Playback-JWT": token }
      : undefined;

    const data = await frameworksGraphqlRequest<ResolveViewerEndpointQuery>(
      RESOLVE_VIEWER_ENDPOINT,
      { contentId: playbackId },
      headers,
    );

    const hlsUrl = pickHlsUrl(data);
    return toPlaybackInfo(playbackId, hlsUrl);
  },
};
