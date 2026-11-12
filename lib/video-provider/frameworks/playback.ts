import jwt from "jsonwebtoken";
import type { PlaybackInfoResult } from "../types";
import { frameworksPlayHlsUrl } from "./constants";

export type ResolveViewerEndpointQuery = {
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

function isHlsProtocol(protocol: string | undefined): boolean {
  return protocol?.toUpperCase() === "HLS";
}

function isM3u8Url(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return /\.m3u8(?:\?|#|$)/i.test(url);
  }
}

function isHlsPlaybackUrl(url: string | undefined, protocol?: string): boolean {
  if (!url) return false;
  if (isHlsProtocol(protocol)) return true;
  return isM3u8Url(url);
}

/**
 * Maps a resolveViewerEndpoint catalog entry to an HLS URL only.
 * Intended for browser-side resolve (#405 app layer); server playback uses Foghorn /play.
 */
export function pickHlsUrl(data: ResolveViewerEndpointQuery): string | undefined {
  const primary = data.resolveViewerEndpoint?.primary;
  const hlsOutput = primary?.outputs?.HLS;
  if (hlsOutput?.url) {
    return hlsOutput.url;
  }
  if (primary?.url && isHlsPlaybackUrl(primary.url, primary.protocol)) {
    return primary.url;
  }
  const outputs = primary?.outputs;
  if (outputs) {
    for (const value of Object.values(outputs)) {
      if (value?.url && isHlsPlaybackUrl(value.url, value.protocol)) {
        return value.url;
      }
    }
  }
  const fallback = data.resolveViewerEndpoint?.fallbacks?.find((f) =>
    isHlsPlaybackUrl(f.url, f.protocol),
  );
  return fallback?.url;
}

function viewerPlayHlsUrl(playbackId: string, jwtToken: string | null): string {
  const url = frameworksPlayHlsUrl(playbackId);
  if (!jwtToken) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("jwt", jwtToken);
  return parsed.toString();
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
    const url = viewerPlayHlsUrl(playbackId, token);
    return toPlaybackInfo(playbackId, url);
  },
};
